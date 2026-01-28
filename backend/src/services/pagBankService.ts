import type {
  IPaymentService,
  CreatePaymentParams,
  PaymentResult,
  PointPaymentParams,
  PointPaymentResult,
  PaymentStatusResult,
  StorePaymentConfig,
} from './paymentTypes.js';

// PagBank API URL - sempre usar a de produção quando tiver token de produção
// O token de sandbox tem formato diferente do token de produção
const PAGBANK_API_URL = process.env.PAGBANK_SANDBOX === 'true'
  ? 'https://sandbox.api.pagseguro.com'
  : 'https://api.pagseguro.com';

// PagBank API response types
interface PagBankErrorResponse {
  error_messages?: Array<{
    code?: string;
    description?: string;
    parameter_name?: string;
  }>;
  message?: string;
  reference?: string;
}

interface PagBankQRCode {
  text?: string;
  links?: Array<{ media: string; href: string }>;
}

interface PagBankLink {
  rel: string;
  href: string;
}

interface PagBankOrderResponse {
  id: string;
  qr_codes?: PagBankQRCode[];
  links?: PagBankLink[];
  charges?: Array<{
    id: string;
    status: string;
    payment_method?: { type: string };
  }>;
}

interface PagBankChargeResponse {
  id: string;
  status?: string;
}

export class PagBankService implements IPaymentService {
  private getHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async createOnlinePayment(
    params: CreatePaymentParams,
    config: StorePaymentConfig
  ): Promise<PaymentResult> {
    try {
      const token = config.pbToken || process.env.PAGBANK_TOKEN;

      if (!token) {
        return { success: false, error: 'PagBank não configurado para esta loja' };
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

      console.log('[PagBank] Iniciando criação de pagamento');
      console.log('[PagBank] API URL:', PAGBANK_API_URL);
      console.log('[PagBank] Token (primeiros 20 chars):', token.substring(0, 20) + '...');

      // Usar endpoint de checkout para pagamento online com redirect
      const checkoutData = {
        reference_id: params.orderId,
        expiration_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
        customer_modifiable: false,
        items: params.items.map((item) => ({
          reference_id: item.id.substring(0, 64), // Max 64 chars
          name: item.title.substring(0, 64), // Max 64 chars
          quantity: item.quantity,
          unit_amount: Math.round(item.unitPrice * 100),
        })),
        additional_amount: 0,
        discount_amount: 0,
        payment_methods: [
          { type: 'PIX' },
          { type: 'CREDIT_CARD' },
          { type: 'DEBIT_CARD' },
        ],
        payment_methods_configs: [
          {
            type: 'CREDIT_CARD',
            config_options: [
              { option: 'INSTALLMENTS_LIMIT', value: '1' },
            ],
          },
        ],
        soft_descriptor: 'AUTOATENDIMENTO',
        redirect_url: `${frontendUrl}/${params.storeSlug}/pagamento/sucesso`,
        return_url: `${frontendUrl}/${params.storeSlug}/pagamento/sucesso`,
        notification_urls: [`${backendUrl}/api/payments/webhook/pagbank`],
      };

      console.log('[PagBank] Checkout data:', JSON.stringify(checkoutData, null, 2));

      const response = await fetch(`${PAGBANK_API_URL}/checkouts`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(checkoutData),
      });

      const responseText = await response.text();
      console.log('[PagBank] Response status:', response.status);
      console.log('[PagBank] Response body:', responseText);

      if (!response.ok) {
        let errorData: PagBankErrorResponse & { message?: string } = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          console.error('[PagBank] Erro ao parsear resposta de erro');
        }

        const errorMessage = errorData.error_messages?.[0]?.description
          || errorData.message
          || `Erro HTTP ${response.status}`;

        console.error('[PagBank] Erro:', errorMessage);
        return {
          success: false,
          error: `PagBank: ${errorMessage}`,
        };
      }

      const data = JSON.parse(responseText) as PagBankOrderResponse;

      // Buscar link de pagamento
      const payLink = data.links?.find((l) => l.rel === 'PAY')?.href;

      console.log('[PagBank] Checkout criado com sucesso. ID:', data.id);
      console.log('[PagBank] Pay link:', payLink);

      return {
        success: true,
        preferenceId: data.id,
        initPoint: payLink,
      };
    } catch (error) {
      console.error('[PagBank] createOnlinePayment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pagamento',
      };
    }
  }

  async createPointPayment(
    params: PointPaymentParams,
    config: StorePaymentConfig
  ): Promise<PointPaymentResult> {
    try {
      const token = config.pbToken || process.env.PAGBANK_TOKEN;
      const deviceSerial = config.pbPointSerial || process.env.PAGBANK_POINT_DEVICE_SERIAL;

      if (!token) {
        return { success: false, error: 'PagBank não configurado' };
      }

      if (!deviceSerial) {
        return { success: false, error: 'Terminal Moderninha não configurado' };
      }

      // PagBank Point (PlugPag) - Para integração com Moderninha
      // Nota: A integração com maquininha PagBank é feita via PlugPag SDK
      // que roda localmente no dispositivo. Esta API é para criar a intenção
      // de pagamento que será processada pelo PlugPag.

      const paymentData = {
        reference_id: params.orderId,
        description: params.description,
        amount: {
          value: Math.round(params.amount * 100),
          currency: 'BRL',
        },
        payment_method: {
          type: 'DEBIT_CARD', // ou CREDIT_CARD
          card: {
            capture: true,
          },
        },
        notification_urls: [`${process.env.BACKEND_URL}/api/payments/webhook/pagbank`],
      };

      const response = await fetch(`${PAGBANK_API_URL}/charges`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json() as PagBankErrorResponse;
        console.error('PagBank Point error:', errorData);
        return {
          success: false,
          error: errorData.error_messages?.[0]?.description || 'Erro ao criar cobrança',
        };
      }

      const data = await response.json() as PagBankChargeResponse;

      return {
        success: true,
        paymentIntentId: data.id,
        status: data.status || 'PENDING',
      };
    } catch (error) {
      console.error('PagBank Point error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar pagamento na maquininha',
      };
    }
  }

  async getPaymentStatus(
    orderId: string,
    config: StorePaymentConfig
  ): Promise<PaymentStatusResult> {
    try {
      const token = config.pbToken || process.env.PAGBANK_TOKEN;

      if (!token) {
        return { status: 'PENDING' };
      }

      const response = await fetch(`${PAGBANK_API_URL}/orders/${orderId}`, {
        headers: this.getHeaders(token),
      });

      if (!response.ok) {
        return { status: 'PENDING' };
      }

      const data = await response.json() as PagBankOrderResponse;

      const statusMap: Record<string, PaymentStatusResult['status']> = {
        PAID: 'PAID',
        AUTHORIZED: 'PENDING',
        DECLINED: 'CANCELLED',
        CANCELED: 'CANCELLED',
      };

      const charge = data.charges?.[0];

      return {
        status: statusMap[charge?.status || ''] || 'PENDING',
        paymentId: charge?.id,
        paymentMethod: charge?.payment_method?.type,
      };
    } catch (error) {
      console.error('PagBank get status error:', error);
      return { status: 'PENDING' };
    }
  }

  async handleWebhook(
    body: { reference_id?: string; charges?: Array<{ status: string; id: string }> },
    config: StorePaymentConfig
  ): Promise<{ orderId?: string; status?: string }> {
    try {
      const statusMap: Record<string, string> = {
        PAID: 'PAID',
        AUTHORIZED: 'PENDING',
        DECLINED: 'CANCELLED',
        CANCELED: 'CANCELLED',
      };

      const charge = body.charges?.[0];

      return {
        orderId: body.reference_id,
        status: statusMap[charge?.status || ''] || 'PENDING',
      };
    } catch (error) {
      console.error('PagBank webhook error:', error);
      return {};
    }
  }

  // Criar checkout com cartão (para uso com maquininha física via PlugPag)
  async createCardCheckout(
    params: CreatePaymentParams,
    config: StorePaymentConfig
  ): Promise<PaymentResult> {
    try {
      const token = config.pbToken || process.env.PAGBANK_TOKEN;

      if (!token) {
        return { success: false, error: 'PagBank não configurado' };
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

      // Criar checkout para pagamento com cartão
      const checkoutData = {
        reference_id: params.orderId,
        expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        customer_modifiable: false,
        items: params.items.map((item) => ({
          reference_id: item.id,
          name: item.title,
          quantity: item.quantity,
          unit_amount: Math.round(item.unitPrice * 100),
        })),
        additional_amount: 0,
        discount_amount: 0,
        payment_methods: [
          { type: 'CREDIT_CARD' },
          { type: 'DEBIT_CARD' },
          { type: 'PIX' },
        ],
        payment_methods_configs: [
          {
            type: 'CREDIT_CARD',
            config_options: [
              { option: 'INSTALLMENTS_LIMIT', value: '1' },
            ],
          },
        ],
        redirect_url: `${frontendUrl}/${params.storeSlug}/pagamento/sucesso`,
        notification_urls: [`${backendUrl}/api/payments/webhook/pagbank`],
      };

      const response = await fetch(`${PAGBANK_API_URL}/checkouts`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorData = await response.json() as PagBankErrorResponse;
        console.error('PagBank checkout error:', errorData);
        return {
          success: false,
          error: errorData.error_messages?.[0]?.description || 'Erro ao criar checkout',
        };
      }

      const data = await response.json() as PagBankOrderResponse;

      return {
        success: true,
        preferenceId: data.id,
        initPoint: data.links?.find((l) => l.rel === 'PAY')?.href,
      };
    } catch (error) {
      console.error('PagBank checkout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar checkout',
      };
    }
  }
}

export const pagBankService = new PagBankService();
