import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tipos para request body
interface CreateCustomerBody {
  name: string;
  cpf: string;
  rg?: string;
  phone: string;
  email?: string;
  photo?: string;
  condominium: string;
  block?: string;
  unit: string;
  notes?: string;
}

interface UpdateCustomerBody extends Partial<CreateCustomerBody> {
  active?: boolean;
}

interface CustomerFilters {
  search?: string;
  condominium?: string;
  active?: string;
  page?: string;
  limit?: string;
}

// Função para formatar CPF (remove caracteres não numéricos)
function formatCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// Função para validar CPF
function isValidCpf(cpf: string): boolean {
  const cleanCpf = formatCpf(cpf);

  if (cleanCpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(10))) return false;

  return true;
}

// Função para formatar telefone (remove caracteres não numéricos)
function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Lista todos os clientes de uma loja
 * GET /api/customers?storeId=xxx
 */
export async function listCustomers(req: Request, res: Response) {
  try {
    const { search, condominium, active, page = '1', limit = '20' } = req.query as CustomerFilters;
    const storeId = req.query.storeId as string;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: {
      storeId: string;
      active?: boolean;
      condominium?: { contains: string; mode: 'insensitive' };
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        cpf?: { contains: string };
        phone?: { contains: string };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      storeId,
    };

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (condominium) {
      where.condominium = { contains: condominium, mode: 'insensitive' };
    }

    if (search) {
      const searchClean = search.replace(/\D/g, '');
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: searchClean } },
        { phone: { contains: searchClean } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          cpf: true,
          rg: true,
          phone: true,
          email: true,
          photo: true,
          condominium: true,
          block: true,
          unit: true,
          active: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.json({
      data: customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listing customers:', error);
    return res.status(500).json({ error: 'Erro ao listar clientes' });
  }
}

/**
 * Busca um cliente por ID
 * GET /api/customers/:id
 */
export async function getCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const storeId = req.query.storeId as string;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, storeId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            paymentMethod: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    return res.json(customer);
  } catch (error) {
    console.error('Error getting customer:', error);
    return res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
}

/**
 * Busca cliente por CPF
 * GET /api/customers/cpf/:cpf?storeId=xxx
 */
export async function getCustomerByCpf(req: Request, res: Response) {
  try {
    const { cpf } = req.params;
    const storeId = req.query.storeId as string;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    const cleanCpf = formatCpf(cpf);

    const customer = await prisma.customer.findFirst({
      where: { cpf: cleanCpf, storeId },
      select: {
        id: true,
        name: true,
        cpf: true,
        phone: true,
        photo: true,
        condominium: true,
        block: true,
        unit: true,
        active: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!customer.active) {
      return res.status(403).json({ error: 'Cliente inativo', customer });
    }

    return res.json(customer);
  } catch (error) {
    console.error('Error getting customer by CPF:', error);
    return res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
}

/**
 * Cria um novo cliente
 * POST /api/customers
 */
export async function createCustomer(req: Request, res: Response) {
  try {
    const storeId = req.query.storeId as string || req.body.storeId;
    const body = req.body as CreateCustomerBody;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    // Validar campos obrigatórios
    if (!body.name?.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    if (!body.cpf) {
      return res.status(400).json({ error: 'CPF é obrigatório' });
    }

    const cleanCpf = formatCpf(body.cpf);

    if (!isValidCpf(cleanCpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    if (!body.phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' });
    }

    const cleanPhone = formatPhone(body.phone);

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: 'Telefone inválido (deve ter 10 ou 11 dígitos)' });
    }

    if (!body.condominium?.trim()) {
      return res.status(400).json({ error: 'Condomínio é obrigatório' });
    }

    if (!body.unit?.trim()) {
      return res.status(400).json({ error: 'Unidade/Apartamento é obrigatório' });
    }

    // Verificar se já existe cliente com esse CPF na loja
    const existingCustomer = await prisma.customer.findFirst({
      where: { cpf: cleanCpf, storeId },
    });

    if (existingCustomer) {
      return res.status(409).json({
        error: 'Já existe um cliente com este CPF cadastrado',
        existingId: existingCustomer.id,
      });
    }

    // Verificar se a loja existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name.trim(),
        cpf: cleanCpf,
        rg: body.rg?.replace(/\D/g, '') || null,
        phone: cleanPhone,
        email: body.email?.trim().toLowerCase() || null,
        photo: body.photo || null,
        condominium: body.condominium.trim(),
        block: body.block?.trim() || null,
        unit: body.unit.trim(),
        notes: body.notes?.trim() || null,
        storeId,
      },
    });

    return res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ error: 'Erro ao criar cliente' });
  }
}

/**
 * Atualiza um cliente
 * PUT /api/customers/:id
 */
export async function updateCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const storeId = req.query.storeId as string || req.body.storeId;
    const body = req.body as UpdateCustomerBody;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    // Verificar se o cliente existe
    const existingCustomer = await prisma.customer.findFirst({
      where: { id, storeId },
    });

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Preparar dados para atualização
    const updateData: {
      name?: string;
      cpf?: string;
      rg?: string | null;
      phone?: string;
      email?: string | null;
      photo?: string | null;
      condominium?: string;
      block?: string | null;
      unit?: string;
      notes?: string | null;
      active?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return res.status(400).json({ error: 'Nome não pode ser vazio' });
      }
      updateData.name = body.name.trim();
    }

    if (body.cpf !== undefined) {
      const cleanCpf = formatCpf(body.cpf);
      if (!isValidCpf(cleanCpf)) {
        return res.status(400).json({ error: 'CPF inválido' });
      }

      // Verificar se outro cliente já tem esse CPF
      const duplicateCpf = await prisma.customer.findFirst({
        where: { cpf: cleanCpf, storeId, NOT: { id } },
      });

      if (duplicateCpf) {
        return res.status(409).json({ error: 'Já existe outro cliente com este CPF' });
      }

      updateData.cpf = cleanCpf;
    }

    if (body.rg !== undefined) {
      updateData.rg = body.rg ? body.rg.replace(/\D/g, '') : null;
    }

    if (body.phone !== undefined) {
      const cleanPhone = formatPhone(body.phone);
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return res.status(400).json({ error: 'Telefone inválido' });
      }
      updateData.phone = cleanPhone;
    }

    if (body.email !== undefined) {
      updateData.email = body.email ? body.email.trim().toLowerCase() : null;
    }

    if (body.photo !== undefined) {
      updateData.photo = body.photo || null;
    }

    if (body.condominium !== undefined) {
      if (!body.condominium.trim()) {
        return res.status(400).json({ error: 'Condomínio não pode ser vazio' });
      }
      updateData.condominium = body.condominium.trim();
    }

    if (body.block !== undefined) {
      updateData.block = body.block ? body.block.trim() : null;
    }

    if (body.unit !== undefined) {
      if (!body.unit.trim()) {
        return res.status(400).json({ error: 'Unidade não pode ser vazia' });
      }
      updateData.unit = body.unit.trim();
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes ? body.notes.trim() : null;
    }

    if (body.active !== undefined) {
      updateData.active = body.active;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
}

/**
 * Remove um cliente (soft delete - desativa)
 * DELETE /api/customers/:id
 */
export async function deleteCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const storeId = req.query.storeId as string;
    const permanent = req.query.permanent === 'true';

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, storeId },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (permanent) {
      // Remoção permanente - só se não tiver pedidos
      if (customer._count.orders > 0) {
        return res.status(400).json({
          error: 'Não é possível remover permanentemente um cliente que possui pedidos. Use a desativação.',
          ordersCount: customer._count.orders,
        });
      }

      await prisma.customer.delete({ where: { id } });
      return res.json({ message: 'Cliente removido permanentemente' });
    } else {
      // Soft delete - apenas desativa
      await prisma.customer.update({
        where: { id },
        data: { active: false },
      });
      return res.json({ message: 'Cliente desativado' });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Erro ao remover cliente' });
  }
}

/**
 * Lista condomínios únicos de uma loja (para filtro)
 * GET /api/customers/condominiums?storeId=xxx
 */
export async function listCondominiums(req: Request, res: Response) {
  try {
    const storeId = req.query.storeId as string;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    const condominiums = await prisma.customer.groupBy({
      by: ['condominium'],
      where: { storeId },
      _count: { condominium: true },
      orderBy: { condominium: 'asc' },
    });

    return res.json(
      condominiums.map((c) => ({
        name: c.condominium,
        count: c._count.condominium,
      }))
    );
  } catch (error) {
    console.error('Error listing condominiums:', error);
    return res.status(500).json({ error: 'Erro ao listar condomínios' });
  }
}

/**
 * Estatísticas de clientes de uma loja
 * GET /api/customers/stats?storeId=xxx
 */
export async function getCustomerStats(req: Request, res: Response) {
  try {
    const storeId = req.query.storeId as string;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId é obrigatório' });
    }

    const [total, active, inactive, byCondominium, recentOrders] = await Promise.all([
      prisma.customer.count({ where: { storeId } }),
      prisma.customer.count({ where: { storeId, active: true } }),
      prisma.customer.count({ where: { storeId, active: false } }),
      prisma.customer.groupBy({
        by: ['condominium'],
        where: { storeId },
        _count: { condominium: true },
        orderBy: { _count: { condominium: 'desc' } },
        take: 5,
      }),
      prisma.order.count({
        where: {
          storeId,
          customerId: { not: null },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return res.json({
      total,
      active,
      inactive,
      topCondominiums: byCondominium.map((c) => ({
        name: c.condominium,
        count: c._count.condominium,
      })),
      ordersLast30Days: recentOrders,
    });
  } catch (error) {
    console.error('Error getting customer stats:', error);
    return res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
}
