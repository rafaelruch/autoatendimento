import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory store for pending identifications
// In production, use Redis for multi-instance support
interface PendingIdentification {
  storeId: string;
  customerId?: string;
  customerData?: {
    id: string;
    name: string;
    phone: string;
    photo?: string;
  };
  createdAt: Date;
  claimedAt?: Date;
}

const pendingIdentifications = new Map<string, PendingIdentification>();

// Clean up old sessions every minute
setInterval(() => {
  const now = new Date();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [token, session] of pendingIdentifications.entries()) {
    if (now.getTime() - session.createdAt.getTime() > maxAge) {
      pendingIdentifications.delete(token);
    }
  }
}, 60000);

/**
 * Create a new identification session
 * POST /api/identification/session
 * Body: { storeId: string }
 * Returns: { token: string }
 */
export async function createSession(req: Request, res: Response) {
  try {
    const { storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId e obrigatorio' });
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ error: 'Loja nao encontrada' });
    }

    const token = randomUUID();

    pendingIdentifications.set(token, {
      storeId,
      createdAt: new Date(),
    });

    return res.json({ token });
  } catch (error) {
    console.error('Error creating identification session:', error);
    return res.status(500).json({ error: 'Erro ao criar sessao' });
  }
}

/**
 * Claim a session with customer data
 * POST /api/identification/claim
 * Body: { token: string, customerId: string }
 */
export async function claimSession(req: Request, res: Response) {
  try {
    const { token, customerId } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token e obrigatorio' });
    }

    if (!customerId) {
      return res.status(400).json({ error: 'customerId e obrigatorio' });
    }

    const session = pendingIdentifications.get(token);

    if (!session) {
      return res.status(404).json({ error: 'Sessao nao encontrada ou expirada' });
    }

    if (session.claimedAt) {
      return res.status(409).json({ error: 'Sessao ja foi reivindicada' });
    }

    // Get customer data
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        photo: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente nao encontrado' });
    }

    // Update session
    session.customerId = customerId;
    session.customerData = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      photo: customer.photo || undefined,
    };
    session.claimedAt = new Date();

    return res.json({ success: true });
  } catch (error) {
    console.error('Error claiming session:', error);
    return res.status(500).json({ error: 'Erro ao reivindicar sessao' });
  }
}

/**
 * Check if a session has been claimed
 * GET /api/identification/check/:token
 * Returns: { claimed: boolean, customer?: CustomerData }
 */
export async function checkSession(req: Request, res: Response) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token e obrigatorio' });
    }

    const session = pendingIdentifications.get(token);

    if (!session) {
      return res.status(404).json({ error: 'Sessao nao encontrada ou expirada' });
    }

    if (session.claimedAt && session.customerData) {
      // Session was claimed, return customer data and delete session
      const customerData = session.customerData;
      pendingIdentifications.delete(token);

      return res.json({
        claimed: true,
        customer: customerData,
      });
    }

    return res.json({ claimed: false });
  } catch (error) {
    console.error('Error checking session:', error);
    return res.status(500).json({ error: 'Erro ao verificar sessao' });
  }
}
