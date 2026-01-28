import { Router } from 'express';
import {
  createPreference,
  createPointPayment,
  getPointPaymentStatus,
  cancelPointPayment,
  handleMercadoPagoWebhook,
  handlePagBankWebhook,
  getPaymentStatus,
  getPaymentOptions,
  listPointDevices,
} from '../controllers/paymentController.js';

export const paymentRoutes = Router();

// Pagamento online (PIX, cartão via checkout)
paymentRoutes.post('/create-preference', createPreference);

// Pagamento via maquininha (Point)
paymentRoutes.post('/point/create', createPointPayment);
paymentRoutes.get('/point/status/:paymentIntentId', getPointPaymentStatus);
paymentRoutes.delete('/point/cancel/:paymentIntentId', cancelPointPayment);

// Webhooks (separados por provider)
paymentRoutes.post('/webhook/mercadopago', handleMercadoPagoWebhook);
paymentRoutes.post('/webhook/pagbank', handlePagBankWebhook);
// Rota legada para compatibilidade
paymentRoutes.post('/webhook', handleMercadoPagoWebhook);

// Status e opções
paymentRoutes.get('/status/:id', getPaymentStatus);
paymentRoutes.get('/options/:storeId', getPaymentOptions);
paymentRoutes.get('/devices/:storeId', listPointDevices);
