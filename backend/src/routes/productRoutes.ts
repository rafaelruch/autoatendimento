import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getProductByBarcode,
} from '../controllers/productController.js';

export const productRoutes = Router();

productRoutes.get('/', getProducts);
productRoutes.get('/:id', getProduct);
productRoutes.get('/barcode/:barcode/:storeId', getProductByBarcode);
