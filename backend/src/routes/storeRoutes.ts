import { Router } from 'express';
import {
  getActiveStores,
  getStoreBySlug,
  getStoreProducts,
} from '../controllers/storeController.js';

export const storeRoutes = Router();

// Public routes
storeRoutes.get('/', getActiveStores);
storeRoutes.get('/:slug', getStoreBySlug);
storeRoutes.get('/:slug/products', getStoreProducts);
