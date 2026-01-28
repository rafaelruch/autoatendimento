import { Router } from 'express';
import { createOrder, getOrder } from '../controllers/orderController.js';

export const orderRoutes = Router();

orderRoutes.post('/', createOrder);
orderRoutes.get('/:id', getOrder);
