import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middlewares/auth.js';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  exportProducts,
  importProducts,
  getProductTemplate,
} from '../controllers/productController.js';
import { getOrders } from '../controllers/orderController.js';
import { uploadCsv } from '../controllers/uploadController.js';

const prisma = new PrismaClient();

export const adminRoutes = Router();

// All admin routes require authentication
adminRoutes.use(authMiddleware);

// Products
adminRoutes.post('/products', createProduct);
adminRoutes.put('/products/:id', updateProduct);
adminRoutes.delete('/products/:id', deleteProduct);

// Product Import/Export (rotas mais específicas antes das gerais)
adminRoutes.get('/products/template', getProductTemplate);
adminRoutes.get('/products/export/:storeId', exportProducts);
adminRoutes.post('/products/import/:storeId', uploadCsv.single('file'), importProducts);

// Orders
adminRoutes.get('/orders', getOrders);

// Dashboard
adminRoutes.get('/dashboard', async (_req, res, next) => {
  try {
    const [totalOrders, paidOrders, pendingOrders, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        where: { status: 'PAID' },
        select: { total: true },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: true },
          },
        },
      }),
    ]);

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

    res.json({
      totalOrders,
      totalRevenue,
      pendingOrders,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: Number(order.total),
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          product: {
            ...item.product,
            price: Number(item.product.price),
          },
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
});
