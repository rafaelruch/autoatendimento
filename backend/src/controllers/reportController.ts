import type { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const prisma = new PrismaClient();

// Helper to get storeId from user
async function getStoreIdFromUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storeId: true },
  });
  return user?.storeId || null;
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get start of day
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get end of day
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getFinancialReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    if (!req.userId) {
      throw createError('Usuario nao autenticado', 401);
    }

    const storeId = await getStoreIdFromUser(req.userId);
    if (!storeId) {
      throw createError('Loja nao encontrada para este usuario', 404);
    }

    // Parse dates or use defaults (last 30 days)
    const end = endDate ? endOfDay(new Date(endDate as string)) : endOfDay(new Date());
    const start = startDate
      ? startOfDay(new Date(startDate as string))
      : startOfDay(new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000));

    const where = {
      storeId,
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    // Parallel queries
    const [orders, byStatus, byPaymentMethod] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          total: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['paymentMethod'],
        where,
        _count: true,
        _sum: { total: true },
      }),
    ]);

    // Calculate summary
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const paidRevenue = orders
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + Number(o.total), 0);
    const pendingRevenue = orders
      .filter((o) => o.status === 'PENDING')
      .reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = orders.length;
    const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Group by day
    const byDayMap = new Map<string, { count: number; total: number }>();
    orders.forEach((order) => {
      const dateKey = formatDate(order.createdAt);
      const existing = byDayMap.get(dateKey) || { count: 0, total: 0 };
      byDayMap.set(dateKey, {
        count: existing.count + 1,
        total: existing.total + Number(order.total),
      });
    });

    const byDay = Array.from(byDayMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        total: data.total,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      summary: {
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        orderCount,
        averageTicket,
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        total: Number(s._sum.total) || 0,
      })),
      byPaymentMethod: byPaymentMethod
        .filter((p) => p.paymentMethod !== null)
        .map((p) => ({
          method: p.paymentMethod || 'Desconhecido',
          count: p._count,
          total: Number(p._sum.total) || 0,
        })),
      byDay,
    });
  } catch (error) {
    next(error);
  }
}

export async function exportFinancialReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    if (!req.userId) {
      throw createError('Usuario nao autenticado', 401);
    }

    const storeId = await getStoreIdFromUser(req.userId);
    if (!storeId) {
      throw createError('Loja nao encontrada para este usuario', 404);
    }

    // Parse dates or use defaults
    const end = endDate ? endOfDay(new Date(endDate as string)) : endOfDay(new Date());
    const start = startDate
      ? startOfDay(new Date(startDate as string))
      : startOfDay(new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000));

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV
    const headers = ['ID', 'Data', 'Status', 'Metodo Pagamento', 'Itens', 'Total'];
    const rows = orders.map((order) => [
      order.id,
      new Date(order.createdAt).toLocaleDateString('pt-BR'),
      order.status,
      order.paymentMethod || '-',
      order.items.map((i) => `${i.quantity}x ${i.product.name}`).join('; '),
      Number(order.total).toFixed(2).replace('.', ','),
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-financeiro-${formatDate(start)}-${formatDate(end)}.csv"`
    );
    res.send(csvWithBom);
  } catch (error) {
    next(error);
  }
}
