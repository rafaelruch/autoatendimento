import { MercadoPagoConfig, Preference, Payment, PaymentMethod } from 'mercadopago';
import type {
  IPaymentService,
  CreatePaymentParams,
  PaymentResult,
  PointPaymentParams,
  PointPaymentResult,
  PaymentStatusResult,
  StorePaymentConfig,
} from './paymentTypes.js';

export class MercadoPagoService implements IPaymentService {
  private getClient(accessToken: string) {
    return new MercadoPagoConfig({ accessToken });
  }

  async createOnlinePayment(
    params: CreatePaymentParams,
    config: StorePaymentConfig
  ): Promise<PaymentResult> {
    try {
      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return { success: false, error: 'Mercado Pago não configurado para esta loja' };
      }

      const client = this.getClient(accessToken);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

      // Para PIX, criar pagamento direto com QR Code (sem login)
      if (params.paymentMethodType === 'PIX') {
        return this.createPixPayment(params, config, frontendUrl, backendUrl);
      }

      // Para cartões, usar Checkout Pro (redirect)
      const preference = new Preference(client);

      const items = params.items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'BRL' as const,
      }));

      // Configurar métodos de pagamento baseado no tipo solicitado
      let paymentMethods: { excluded_payment_types?: Array<{ id: string }> } | undefined;

      if (params.paymentMethodType === 'CREDIT_CARD') {
        // Apenas cartão de crédito
        paymentMethods = {
          excluded_payment_types: [
            { id: 'debit_card' },
            { id: 'bank_transfer' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'prepaid_card' },
          ],
        };
      } else if (params.paymentMethodType === 'DEBIT_CARD') {
        // Apenas cartão de débito
        paymentMethods = {
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'bank_transfer' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'prepaid_card' },
          ],
        };
      }

      // Garantir que storeSlug está definido
      const storeSlug = params.storeSlug || 'loja';

      // Verificar se URLs são válidas (não localhost) - Mercado Pago rejeita localhost
      const isProduction = !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1');

      interface CardPreferenceBody {
        items: typeof items;
        external_reference: string;
        back_urls?: {
          success: string;
          failure: string;
          pending: string;
        };
        auto_return?: 'approved' | 'all';
        payment_methods?: typeof paymentMethods;
        notification_url?: string;
      }

      const preferenceBody: CardPreferenceBody = {
        items,
        external_reference: params.orderId,
        ...(paymentMethods && { payment_methods: paymentMethods }),
      };

      // Só adicionar back_urls e auto_return em produção (Mercado Pago rejeita localhost)
      if (isProduction) {
        preferenceBody.back_urls = {
          success: `${frontendUrl}/${storeSlug}/pagamento/sucesso`,
          failure: `${frontendUrl}/${storeSlug}/pagamento/falha`,
          pending: `${frontendUrl}/${storeSlug}/pagamento/pendente`,
        };
        preferenceBody.auto_return = 'approved';
        preferenceBody.notification_url = `${backendUrl}/api/payments/webhook/mercadopago`;
      }

      const response = await preference.create({ body: preferenceBody });

      return {
        success: true,
        preferenceId: response.id,
        initPoint: response.init_point,
      };
    } catch (error) {
      console.error('Mercado Pago createOnlinePayment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pagamento',
      };
    }
  }

  // Criar pagamento PIX direto (sem redirect, com QR Code)
  private async createPixPayment(
    params: CreatePaymentParams,
    config: StorePaymentConfig,
    frontendUrl: string,
    backendUrl: string
  ): Promise<PaymentResult> {
    const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return { success: false, error: 'Mercado Pago não configurado' };
    }

    const client = this.getClient(accessToken);

    // Verificar se notification_url é válida (não localhost)
    const isValidWebhookUrl = !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1');

    // Tentar criar PIX direto com QR Code
    try {
      const payment = new Payment(client);

      // Descrição do pedido
      const description = params.items.map(i => `${i.quantity}x ${i.title}`).join(', ').substring(0, 256);

      const paymentBody: {
        transaction_amount: number;
        description: string;
        payment_method_id: string;
        external_reference: string;
        payer: { email: string };
        notification_url?: string;
      } = {
        transaction_amount: params.total,
        description: description || 'Pedido',
        payment_method_id: 'pix',
        external_reference: params.orderId,
        payer: {
          email: 'cliente@email.com', // Email genérico para PIX
        },
      };

      // Só adicionar notification_url se for URL válida (produção)
      if (isValidWebhookUrl) {
        paymentBody.notification_url = `${backendUrl}/api/payments/webhook/mercadopago`;
      }

      const paymentData = await payment.create({ body: paymentBody });

      // Extrair dados do PIX
      const pixData = paymentData.point_of_interaction?.transaction_data;

      if (pixData?.qr_code) {
        return {
          success: true,
          preferenceId: String(paymentData.id),
          qrCode: pixData.qr_code,
          qrCodeBase64: pixData.qr_code_base64,
          // Para PIX direto, não há redirect - o frontend mostra o QR Code
          initPoint: undefined,
        };
      }
    } catch (error) {
      // Log error but continue to fallback
      console.warn('PIX direto falhou, usando Checkout Pro:', error);
    }

    // Fallback: usar Checkout Pro com PIX (redirect)
    // Isso funciona mesmo se a conta não tiver chave PIX configurada
    try {
      const preference = new Preference(client);

      const items = params.items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'BRL' as const,
      }));

      // Garantir que storeSlug está definido
      const storeSlug = params.storeSlug || 'loja';

      interface PreferenceBody {
        items: typeof items;
        external_reference: string;
        back_urls: {
          success: string;
          failure: string;
          pending: string;
        };
        auto_return: 'approved' | 'all';
        payment_methods: {
          excluded_payment_types: Array<{ id: string }>;
        };
        notification_url?: string;
      }

      const preferenceBody: PreferenceBody = {
        items,
        external_reference: params.orderId,
        back_urls: {
          success: `${frontendUrl}/${storeSlug}/pagamento/sucesso`,
          failure: `${frontendUrl}/${storeSlug}/pagamento/falha`,
          pending: `${frontendUrl}/${storeSlug}/pagamento/pendente`,
        },
        auto_return: 'approved',
        // Apenas PIX no checkout
        payment_methods: {
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'prepaid_card' },
          ],
        },
      };

      // Só adicionar notification_url se for URL válida (produção)
      if (isValidWebhookUrl) {
        preferenceBody.notification_url = `${backendUrl}/api/payments/webhook/mercadopago`;
      }

      const response = await preference.create({ body: preferenceBody });

      return {
        success: true,
        preferenceId: response.id,
        initPoint: response.init_point,
        // Sem QR code - vai redirecionar para Mercado Pago
      };
    } catch (error) {
      console.error('Mercado Pago PIX fallback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pagamento PIX',
      };
    }
  }

  async createPointPayment(
    params: PointPaymentParams,
    config: StorePaymentConfig
  ): Promise<PointPaymentResult> {
    try {
      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      const deviceId = config.mpPointDeviceId || process.env.MERCADOPAGO_DEVICE_ID;

      if (!accessToken) {
        return { success: false, error: 'Mercado Pago não configurado' };
      }

      if (!deviceId) {
        return { success: false, error: 'Terminal Point não configurado' };
      }

      // Mercado Pago Point API - Payment Intent
      const response = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            amount: Math.round(params.amount * 100), // Valor em centavos
            description: params.description,
            external_reference: params.orderId,
            print_on_terminal: true,
            additional_info: {
              external_reference: params.orderId,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        console.error('Point API error:', errorData);
        return {
          success: false,
          error: errorData.message || 'Erro ao enviar pagamento para o terminal',
        };
      }

      const data = await response.json() as { id: string; state?: string };

      return {
        success: true,
        paymentIntentId: data.id,
        status: data.state || 'PENDING',
      };
    } catch (error) {
      console.error('Mercado Pago Point error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar pagamento na maquininha',
      };
    }
  }

  async getPointPaymentStatus(
    paymentIntentId: string,
    config: StorePaymentConfig
  ): Promise<PointPaymentResult> {
    try {
      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return { success: false, error: 'Mercado Pago não configurado' };
      }

      const response = await fetch(
        `https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Erro ao consultar status do pagamento' };
      }

      const data = await response.json() as { id: string; state: string };

      return {
        success: true,
        paymentIntentId: data.id,
        status: data.state,
      };
    } catch (error) {
      console.error('Get Point status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar status',
      };
    }
  }

  async cancelPointPayment(
    paymentIntentId: string,
    config: StorePaymentConfig
  ): Promise<PointPaymentResult> {
    try {
      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      const deviceId = config.mpPointDeviceId || process.env.MERCADOPAGO_DEVICE_ID;

      if (!accessToken || !deviceId) {
        return { success: false, error: 'Configuração incompleta' };
      }

      const response = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Erro ao cancelar pagamento' };
      }

      return { success: true, status: 'CANCELLED' };
    } catch (error) {
      console.error('Cancel Point payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar',
      };
    }
  }

  async getPaymentStatus(
    paymentId: string,
    config: StorePaymentConfig
  ): Promise<PaymentStatusResult> {
    try {
      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return { status: 'PENDING' };
      }

      const client = this.getClient(accessToken);
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });

      const statusMap: Record<string, PaymentStatusResult['status']> = {
        approved: 'PAID',
        rejected: 'CANCELLED',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
      };

      return {
        status: statusMap[paymentData.status || ''] || 'PENDING',
        paymentId: String(paymentData.id),
        paymentMethod: paymentData.payment_method_id,
      };
    } catch (error) {
      console.error('Get payment status error:', error);
      return { status: 'PENDING' };
    }
  }

  async handleWebhook(
    body: { type?: string; data?: { id: string } },
    config: StorePaymentConfig
  ): Promise<{ orderId?: string; status?: string }> {
    try {
      if (body.type !== 'payment' || !body.data?.id) {
        return {};
      }

      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return {};
      }

      const client = this.getClient(accessToken);
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: body.data.id });

      const statusMap: Record<string, string> = {
        approved: 'PAID',
        rejected: 'CANCELLED',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
      };

      return {
        orderId: paymentData.external_reference || undefined,
        status: statusMap[paymentData.status || ''] || 'PENDING',
      };
    } catch (error) {
      console.error('Webhook handling error:', error);
      return {};
    }
  }

  // Lista os dispositivos Point disponíveis
  async listDevices(config: StorePaymentConfig): Promise<{ devices: Array<{ id: string; operating_mode: string }> }> {
    try {
      const accessToken = config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return { devices: [] };
      }

      const response = await fetch(
        'https://api.mercadopago.com/point/integration-api/devices',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { devices: [] };
      }

      const data = await response.json() as { devices?: Array<{ id: string; operating_mode: string }> };
      return { devices: data.devices || [] };
    } catch (error) {
      console.error('List devices error:', error);
      return { devices: [] };
    }
  }
}

export const mercadoPagoService = new MercadoPagoService();
