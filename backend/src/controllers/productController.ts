import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middlewares/errorHandler.js';
import type { AuthRequest } from '../middlewares/auth.js';

const prisma = new PrismaClient();

export async function getProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    res.json(products.map(p => ({
      ...p,
      price: Number(p.price),
    })));
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw createError('Produto não encontrado', 404);
    }

    res.json({
      ...product,
      price: Number(product.price),
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductByBarcode(req: Request, res: Response, next: NextFunction) {
  try {
    const { barcode, storeId } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        barcode,
        storeId,
        active: true,
      },
    });

    if (!product) {
      throw createError('Produto não encontrado', 404);
    }

    res.json({
      ...product,
      price: Number(product.price),
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, price, image, category, stock, barcode, storeId } = req.body;

    if (!storeId) {
      throw createError('storeId é obrigatório', 400);
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        image,
        category,
        stock: stock || 0,
        barcode,
        storeId,
      },
    });

    res.status(201).json({
      ...product,
      price: Number(product.price),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, price, image, category, stock, barcode, active } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        image,
        category,
        stock,
        barcode,
        active,
      },
    });

    res.json({
      ...product,
      price: Number(product.price),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// Get products by store (for admin)
export async function getProductsByStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });

    res.json(products.map(p => ({
      ...p,
      price: Number(p.price),
    })));
  } catch (error) {
    next(error);
  }
}
