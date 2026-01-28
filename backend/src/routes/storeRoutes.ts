import { Router } from 'express';
import {
  getStoreBySlug,
  getStoreProducts,
} from '../controllers/storeController.js';

export const storeRoutes = Router();

// Public routes
storeRoutes.get('/:slug', getStoreBySlug);
storeRoutes.get('/:slug/products', getStoreProducts);
