import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middlewares/errorHandler.js';

const prisma = new PrismaClient();

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, storeId } = req.body;

    if (!storeId) {
      throw createError('storeId é obrigatório', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError('Items são obrigatórios', 400);
    }

    // Get products and calculate total
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId },
    });

    if (products.length !== productIds.length) {
      throw createError('Um ou mais produtos não encontrados', 404);
    }

    let total = 0;
    const orderItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw createError('Produto não encontrado', 404);
      }
      const unitPrice = Number(product.price);
      total += unitPrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      };
    });

    // Create order with items
    const order = await prisma.order.create({
      data: {
        total,
        storeId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({
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
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw createError('Pedido não encontrado', 404);
    }

    res.json({
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
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrders(_req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      orders.map((order) => ({
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
      }))
    );
  } catch (error) {
    next(error);
  }
}

export async function getOrdersByStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    const orders = await prisma.order.findMany({
      where: { storeId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      orders.map((order) => ({
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
      }))
    );
  } catch (error) {
    next(error);
  }
}
