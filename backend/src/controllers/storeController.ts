import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createError } from '../middlewares/errorHandler.js';

const prisma = new PrismaClient();

// Public: List all active stores (for landing page)
export async function getActiveStores(_req: Request, res: Response, next: NextFunction) {
  try {
    const stores = await prisma.store.findMany({
      where: { active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        primaryColor: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(stores);
  } catch (error) {
    next(error);
  }
}

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
      // Admin user settings (optional)
      adminEmail,
      adminPassword,
      adminName,
    } = req.body;

    if (!slug || !name) {
      throw createError('Slug e nome são obrigatórios', 400);
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw createError('Slug deve conter apenas letras minúsculas, números e hífens', 400);
    }

    // Check if admin email already exists
    if (adminEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      if (existingUser) {
        throw createError('Email do administrador já está em uso', 400);
      }
    }

    // Use transaction to create store and user together
    const result = await prisma.$transaction(async (tx) => {
      // Create store
      const store = await tx.store.create({
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

      // Create admin user if credentials provided
      let adminUser = null;
      if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        adminUser = await tx.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            name: adminName || name + ' Admin',
            role: 'ADMIN',
            storeId: store.id,
          },
        });
      }

      return { store, adminUser };
    });

    // Return without sensitive data
    const { mpAccessToken: _, pbToken: __, ...safeStore } = result.store;
    res.status(201).json({
      ...safeStore,
      adminUser: result.adminUser ? {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
      } : null,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        next(createError('Email do administrador já está em uso', 400));
      } else {
        next(createError('Slug já está em uso', 400));
      }
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

// Super Admin: Get users by store
export async function getStoreUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    const users = await prisma.user.findMany({
      where: { storeId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
}

// Super Admin: Create user for store
export async function createStoreUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw createError('Email, senha e nome são obrigatórios', 400);
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw createError('Loja não encontrada', 404);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError('Email já está em uso', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        storeId,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      next(createError('Email já está em uso', 400));
    } else {
      next(error);
    }
  }
}

// Super Admin: Update user
export async function updateStoreUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { email, password, name } = req.body;

    const updateData: { email?: string; password?: string; name?: string } = {};

    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      next(createError('Email já está em uso', 400));
    } else if (error.code === 'P2025') {
      next(createError('Usuário não encontrado', 404));
    } else {
      next(error);
    }
  }
}

// Super Admin: Delete user
export async function deleteStoreUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      next(createError('Usuário não encontrado', 404));
    } else {
      next(error);
    }
  }
}
