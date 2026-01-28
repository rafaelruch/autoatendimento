import { PrismaClient, PaymentProvider } from '@prisma/client';
import { mercadoPagoService, MercadoPagoService } from './mercadoPagoService.js';
import { pagBankService, PagBankService } from './pagBankService.js';
import type {
  IPaymentService,
  CreatePaymentParams,
  PaymentResult,
  PointPaymentParams,
  PointPaymentResult,
  StorePaymentConfig,
} from './paymentTypes.js';

const prisma = new PrismaClient();

export class PaymentFactory {
  private mercadoPago: MercadoPagoService;
  private pagBank: PagBankService;

  constructor() {
    this.mercadoPago = mercadoPagoService;
    this.pagBank = pagBankService;
  }

  private getService(provider: PaymentProvider): IPaymentService {
    switch (provider) {
      case 'PAGBANK':
        return this.pagBank;
      case 'MERCADOPAGO':
      default:
        return this.mercadoPago;
    }
  }

  async getStoreConfig(storeId: string): Promise<StorePaymentConfig | null> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        paymentProvider: true,
        mpAccessToken: true,
        mpPublicKey: true,
        mpPointDeviceId: true,
        mpPointEnabled: true,
        pbToken: true,
        pbEmail: true,
        pbPointSerial: true,
        pbPointEnabled: true,
      },
    });

    if (!store) return null;

    return {
      provider: store.paymentProvider,
      mpAccessToken: store.mpAccessToken,
      mpPublicKey: store.mpPublicKey,
      mpPointDeviceId: store.mpPointDeviceId,
      mpPointEnabled: store.mpPointEnabled,
      pbToken: store.pbToken,
      pbEmail: store.pbEmail,
      pbPointSerial: store.pbPointSerial,
      pbPointEnabled: store.pbPointEnabled,
    };
  }

  async getStoreConfigBySlug(slug: string): Promise<StorePaymentConfig | null> {
    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        paymentProvider: true,
        mpAccessToken: true,
        mpPublicKey: true,
        mpPointDeviceId: true,
        mpPointEnabled: true,
        pbToken: true,
        pbEmail: true,
        pbPointSerial: true,
        pbPointEnabled: true,
      },
    });

    if (!store) return null;

    return {
      provider: store.paymentProvider,
      mpAccessToken: store.mpAccessToken,
      mpPublicKey: store.mpPublicKey,
      mpPointDeviceId: store.mpPointDeviceId,
      mpPointEnabled: store.mpPointEnabled,
      pbToken: store.pbToken,
      pbEmail: store.pbEmail,
      pbPointSerial: store.pbPointSerial,
      pbPointEnabled: store.pbPointEnabled,
    };
  }

  async createOnlinePayment(
    params: CreatePaymentParams,
    config: StorePaymentConfig,
    preferredProvider?: PaymentProvider
  ): Promise<PaymentResult> {
    const provider = preferredProvider || config.provider;
    const service = this.getService(provider);
    return service.createOnlinePayment(params, config);
  }

  async createPointPayment(
    params: PointPaymentParams,
    config: StorePaymentConfig,
    preferredProvider?: PaymentProvider
  ): Promise<PointPaymentResult> {
    const provider = preferredProvider || config.provider;

    // Verificar se Point está habilitado para o provider
    if (provider === 'MERCADOPAGO' && !config.mpPointEnabled) {
      return { success: false, error: 'Terminal Point do Mercado Pago não está habilitado' };
    }
    if (provider === 'PAGBANK' && !config.pbPointEnabled) {
      return { success: false, error: 'Terminal Moderninha do PagBank não está habilitado' };
    }

    const service = this.getService(provider);
    return service.createPointPayment(params, config);
  }

  async getPointPaymentStatus(
    paymentIntentId: string,
    config: StorePaymentConfig
  ): Promise<PointPaymentResult> {
    if (config.provider === 'MERCADOPAGO') {
      return this.mercadoPago.getPointPaymentStatus(paymentIntentId, config);
    }
    // PagBank não tem endpoint separado para status de Point
    const status = await this.pagBank.getPaymentStatus(paymentIntentId, config);
    return {
      success: true,
      status: status.status,
      paymentIntentId,
    };
  }

  async cancelPointPayment(
    paymentIntentId: string,
    config: StorePaymentConfig
  ): Promise<PointPaymentResult> {
    if (config.provider === 'MERCADOPAGO') {
      return this.mercadoPago.cancelPointPayment(paymentIntentId, config);
    }
    return { success: false, error: 'Cancelamento não suportado para PagBank Point' };
  }

  // Retorna opções de pagamento disponíveis para a loja
  getAvailablePaymentOptions(config: StorePaymentConfig): {
    online: PaymentProvider[];
    point: PaymentProvider[];
  } {
    const online: PaymentProvider[] = [];
    const point: PaymentProvider[] = [];

    if (config.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN) {
      online.push('MERCADOPAGO');
      if (config.mpPointEnabled && config.mpPointDeviceId) {
        point.push('MERCADOPAGO');
      }
    }

    if (config.pbToken || process.env.PAGBANK_TOKEN) {
      online.push('PAGBANK');
      if (config.pbPointEnabled && config.pbPointSerial) {
        point.push('PAGBANK');
      }
    }

    return { online, point };
  }

  // Lista dispositivos Point do Mercado Pago
  async listMercadoPagoDevices(config: StorePaymentConfig) {
    return this.mercadoPago.listDevices(config);
  }
}

export const paymentFactory = new PaymentFactory();
