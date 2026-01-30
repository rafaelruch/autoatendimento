import type { Request, Response, NextFunction } from 'express';
import { PrismaClient, PaymentProvider } from '@prisma/client';
import { paymentFactory } from '../services/paymentFactory.js';
import { createError } from '../middlewares/errorHandler.js';
import type { PaymentMethodType } from '../services/paymentTypes.js';

const prisma = new PrismaClient();

// Criar preferência de pagamento (online)
export async function createPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, provider, paymentMethodType } = req.body;

    if (!orderId) {
      throw createError('orderId é obrigatório', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
    });

    if (!order) {
      throw createError('Pedido não encontrado', 404);
    }

    const config = await paymentFactory.getStoreConfig(order.storeId);

    if (!config) {
      throw createError('Configuração de pagamento não encontrada', 404);
    }

    const items = order.items.map((item) => ({
      id: item.productId,
      title: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    }));

    const result = await paymentFactory.createOnlinePayment(
      {
        orderId,
        items,
        total: Number(order.total),
        storeSlug: order.store.slug,
        paymentMethodType: paymentMethodType as PaymentMethodType | undefined,
      },
      config,
      provider as PaymentProvider | undefined
    );

    if (!result.success) {
      throw createError(result.error || 'Erro ao criar pagamento', 500);
    }

    // Atualizar o pedido com o provider usado e método de pagamento
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: provider || config.provider,
        paymentMethod: paymentMethodType || null,
      },
    });

    res.json({
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      qrCode: result.qrCode,
      qrCodeBase64: result.qrCodeBase64,
    });
  } catch (error) {
    next(error);
  }
}

// Criar pagamento via Point (maquininha)
export async function createPointPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, provider } = req.body;

    if (!orderId) {
      throw createError('orderId é obrigatório', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
      },
    });

    if (!order) {
      throw createError('Pedido não encontrado', 404);
    }

    const config = await paymentFactory.getStoreConfig(order.storeId);

    if (!config) {
      throw createError('Configuração de pagamento não encontrada', 404);
    }

    const selectedProvider = (provider as PaymentProvider) || config.provider;
    const deviceId = selectedProvider === 'MERCADOPAGO'
      ? config.mpPointDeviceId
      : config.pbPointSerial;

    if (!deviceId) {
      throw createError('Terminal não configurado para esta loja', 400);
    }

    const result = await paymentFactory.createPointPayment(
      {
        orderId,
        amount: Number(order.total),
        description: `Pedido ${orderId.slice(0, 8)}`,
        deviceId,
      },
      config,
      selectedProvider
    );

    if (!result.success) {
      throw createError(result.error || 'Erro ao enviar para maquininha', 500);
    }

    // Atualizar o pedido
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: selectedProvider,
        pointPayment: true,
        paymentId: result.paymentIntentId,
      },
    });

    res.json({
      success: true,
      paymentIntentId: result.paymentIntentId,
      status: result.status,
      message: 'Pagamento enviado para a maquininha. Aguarde a confirmação.',
    });
  } catch (error) {
    next(error);
  }
}

// Verificar status do pagamento Point
export async function getPointPaymentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentIntentId } = req.params;
    const { storeId } = req.query;

    if (!storeId) {
      throw createError('storeId é obrigatório', 400);
    }

    const config = await paymentFactory.getStoreConfig(storeId as string);

    if (!config) {
      throw createError('Loja não encontrada', 404);
    }

    const result = await paymentFactory.getPointPaymentStatus(paymentIntentId, config);

    if (!result.success) {
      throw createError(result.error || 'Erro ao verificar status', 500);
    }

    // Se o pagamento foi aprovado, atualizar o pedido
    if (result.status === 'FINISHED' || result.status === 'PAID') {
      await prisma.order.updateMany({
        where: { paymentId: paymentIntentId },
        data: { status: 'PAID' },
      });
    }

    res.json({
      status: result.status,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error) {
    next(error);
  }
}

// Cancelar pagamento Point
export async function cancelPointPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentIntentId } = req.params;
    const { storeId } = req.body;

    if (!storeId) {
      throw createError('storeId é obrigatório', 400);
    }

    const config = await paymentFactory.getStoreConfig(storeId);

    if (!config) {
      throw createError('Loja não encontrada', 404);
    }

    const result = await paymentFactory.cancelPointPayment(paymentIntentId, config);

    if (!result.success) {
      throw createError(result.error || 'Erro ao cancelar pagamento', 500);
    }

    // Atualizar o pedido
    await prisma.order.updateMany({
      where: { paymentId: paymentIntentId },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, message: 'Pagamento cancelado' });
  } catch (error) {
    next(error);
  }
}

// Webhook do Mercado Pago
export async function handleMercadoPagoWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, data } = req.body;

    if (type === 'payment' && data?.id) {
      // Buscar o pedido pelo external_reference
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { paymentId: String(data.id) },
          ],
        },
        include: { store: true },
      });

      if (order) {
        const config = await paymentFactory.getStoreConfig(order.storeId);

        if (config) {
          const { status } = await paymentFactory
            .getAvailablePaymentOptions(config).online.includes('MERCADOPAGO')
            ? await import('../services/mercadoPagoService.js').then(m =>
                m.mercadoPagoService.handleWebhook(req.body, config)
              )
            : { status: undefined };

          if (status) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: status as 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED',
                paymentId: String(data.id),
              },
            });
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Mercado Pago error:', error);
    res.status(200).send('OK');
  }
}

// Webhook do PagBank
export async function handlePagBankWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { reference_id, charges } = req.body;

    if (reference_id) {
      const order = await prisma.order.findUnique({
        where: { id: reference_id },
      });

      if (order) {
        const config = await paymentFactory.getStoreConfig(order.storeId);

        if (config) {
          const { status } = await import('../services/pagBankService.js').then(m =>
            m.pagBankService.handleWebhook(req.body, config)
          );

          if (status) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: status as 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED',
                paymentId: charges?.[0]?.id,
              },
            });
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook PagBank error:', error);
    res.status(200).send('OK');
  }
}

// Status do pagamento
export async function getPaymentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { paymentId: id }],
      },
    });

    if (!order) {
      throw createError('Pagamento não encontrado', 404);
    }

    res.json({
      status: order.status,
      paymentId: order.paymentId,
      paymentProvider: order.paymentProvider,
      pointPayment: order.pointPayment,
    });
  } catch (error) {
    next(error);
  }
}

// Obter opções de pagamento disponíveis para uma loja
export async function getPaymentOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    const config = await paymentFactory.getStoreConfig(storeId);

    if (!config) {
      throw createError('Loja não encontrada', 404);
    }

    const options = paymentFactory.getAvailablePaymentOptions(config);

    res.json({
      defaultProvider: config.provider,
      online: options.online,
      point: options.point,
      hasPoint: options.point.length > 0,
    });
  } catch (error) {
    next(error);
  }
}

// Listar dispositivos Point do Mercado Pago
export async function listPointDevices(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    const config = await paymentFactory.getStoreConfig(storeId);

    if (!config) {
      throw createError('Loja não encontrada', 404);
    }

    const result = await paymentFactory.listMercadoPagoDevices(config);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
