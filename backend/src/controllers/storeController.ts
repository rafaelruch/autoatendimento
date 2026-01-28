import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middlewares/errorHandler.js';

const prisma = new PrismaClient();

// Public: Get store by slug
export async function getStoreBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        primaryColor: true,
        active: true,
      },
    });

    if (!store || !store.active) {
      throw createError('Loja não encontrada', 404);
    }

    res.json(store);
  } catch (error) {
    next(error);
  }
}

// Public: Get products by store slug
export async function getStoreProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    const store = await prisma.store.findUnique({
      where: { slug },
    });

    if (!store || !store.active) {
      throw createError('Loja não encontrada', 404);
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        active: true,
      },
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

// Super Admin: List all stores
export async function getStores(_req: Request, res: Response, next: NextFunction) {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    // Remove sensitive data from response
    const safeStores = stores.map(store => {
      const { mpAccessToken, pbToken, ...safeStore } = store;
      return {
        ...safeStore,
        // Indicate if tokens are configured without exposing them
        hasMpToken: !!mpAccessToken,
        hasPbToken: !!pbToken,
      };
    });

    res.json(safeStores);
  } catch (error) {
    next(error);
  }
}

// Super Admin: Create store
export async function createStore(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      slug,
      name,
      logo,
      primaryColor,
      // Payment settings
      paymentProvider,
      mpAccessToken,
      mpPublicKey,
      mpPointDeviceId,
      mpPointEnabled,
      pbToken,
      pbEmail,
      pbPointSerial,
      pbPointEnabled,
    } = req.body;

    if (!slug || !name) {
      throw createError('Slug e nome são obrigatórios', 400);
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw createError('Slug deve conter apenas letras minúsculas, números e hífens', 400);
    }

    const store = await prisma.store.create({
      data: {
        slug,
        name,
        logo,
        primaryColor: primaryColor || '#16a34a',
        // Payment settings
        paymentProvider: paymentProvider || 'MERCADOPAGO',
        mpAccessToken,
        mpPublicKey,
        mpPointDeviceId,
        mpPointEnabled: mpPointEnabled || false,
        pbToken,
        pbEmail,
        pbPointSerial,
        pbPointEnabled: pbPointEnabled || false,
      },
    });

    // Return without sensitive data
    const { mpAccessToken: _, pbToken: __, ...safeStore } = store;
    res.status(201).json(safeStore);
  } catch (error: any) {
    if (error.code === 'P2002') {
      next(createError('Slug já está em uso', 400));
    } else {
      next(error);
    }
  }
}

// Super Admin: Update store
export async function updateStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const {
      slug,
      name,
      logo,
      primaryColor,
      active,
      // Payment settings
      paymentProvider,
      mpAccessToken,
      mpPublicKey,
      mpPointDeviceId,
      mpPointEnabled,
      pbToken,
      pbEmail,
      pbPointSerial,
      pbPointEnabled,
    } = req.body;

    // Validate slug format if provided
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      throw createError('Slug deve conter apenas letras minúsculas, números e hífens', 400);
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        slug,
        name,
        logo,
        primaryColor,
        active,
        // Payment settings (only update if provided)
        ...(paymentProvider !== undefined && { paymentProvider }),
        ...(mpAccessToken !== undefined && { mpAccessToken }),
        ...(mpPublicKey !== undefined && { mpPublicKey }),
        ...(mpPointDeviceId !== undefined && { mpPointDeviceId }),
        ...(mpPointEnabled !== undefined && { mpPointEnabled }),
        ...(pbToken !== undefined && { pbToken }),
        ...(pbEmail !== undefined && { pbEmail }),
        ...(pbPointSerial !== undefined && { pbPointSerial }),
        ...(pbPointEnabled !== undefined && { pbPointEnabled }),
      },
    });

    // Return without sensitive data
    const { mpAccessToken: _, pbToken: __, ...safeStore } = store;
    res.json(safeStore);
  } catch (error: any) {
    if (error.code === 'P2002') {
      next(createError('Slug já está em uso', 400));
    } else if (error.code === 'P2025') {
      next(createError('Loja não encontrada', 404));
    } else {
      next(error);
    }
  }
}

// Super Admin: Delete store
export async function deleteStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    await prisma.store.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      next(createError('Loja não encontrada', 404));
    } else {
      next(error);
    }
  }
}
