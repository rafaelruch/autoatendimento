import type { PaymentProvider } from '@prisma/client';

export interface PaymentItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethodType = 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD';

export interface CreatePaymentParams {
  orderId: string;
  items: PaymentItem[];
  total: number;
  storeSlug: string;
  usePoint?: boolean;  // Se deve usar maquininha
  paymentMethodType?: PaymentMethodType; // Tipo específico de pagamento
}

export interface PaymentResult {
  success: boolean;
  preferenceId?: string;
  initPoint?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface PointPaymentParams {
  orderId: string;
  amount: number;
  description: string;
  deviceId: string;
}

export interface PointPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status?: string;
  error?: string;
}

export interface PaymentStatusResult {
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  paymentId?: string;
  paymentMethod?: string;
}

export interface StorePaymentConfig {
  provider: PaymentProvider;
  // Mercado Pago
  mpAccessToken?: string | null;
  mpPublicKey?: string | null;
  mpPointDeviceId?: string | null;
  mpPointEnabled: boolean;
  // PagBank
  pbToken?: string | null;
  pbEmail?: string | null;
  pbPointSerial?: string | null;
  pbPointEnabled: boolean;
}

export interface IPaymentService {
  createOnlinePayment(params: CreatePaymentParams, config: StorePaymentConfig): Promise<PaymentResult>;
  createPointPayment(params: PointPaymentParams, config: StorePaymentConfig): Promise<PointPaymentResult>;
  getPaymentStatus(paymentId: string, config: StorePaymentConfig): Promise<PaymentStatusResult>;
  handleWebhook(body: unknown, config: StorePaymentConfig): Promise<{ orderId?: string; status?: string }>;
}
