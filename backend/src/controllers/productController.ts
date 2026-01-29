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

// Export products to CSV
export async function exportProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });

    // CSV header
    const csvHeader = 'nome;descricao;preco;categoria;estoque;codigo_barras;ativo;imagem\n';

    // CSV rows
    const csvRows = products.map(p => {
      const nome = (p.name || '').replace(/;/g, ',').replace(/\n/g, ' ');
      const descricao = (p.description || '').replace(/;/g, ',').replace(/\n/g, ' ');
      const preco = Number(p.price).toFixed(2).replace('.', ',');
      const categoria = (p.category || '').replace(/;/g, ',');
      const estoque = p.stock || 0;
      const codigoBarras = p.barcode || '';
      const ativo = p.active ? 'sim' : 'nao';
      const imagem = p.image || '';

      return `${nome};${descricao};${preco};${categoria};${estoque};${codigoBarras};${ativo};${imagem}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=produtos-${Date.now()}.csv`);

    // Add BOM for Excel to recognize UTF-8
    res.send('\ufeff' + csv);
  } catch (error) {
    next(error);
  }
}

// Get CSV template for import
export async function getProductTemplate(_req: Request, res: Response) {
  const csvHeader = 'nome;descricao;preco;categoria;estoque;codigo_barras;ativo;imagem\n';
  const csvExample = 'Coca-Cola 350ml;Refrigerante Coca-Cola lata 350ml;5,99;Bebidas;100;7891234567890;sim;\n' +
                     'Pao Frances;Pao frances unidade;0,75;Padaria;50;;sim;\n' +
                     'Leite Integral 1L;Leite integral caixa 1 litro;6,49;Laticinios;30;7891234567891;sim;';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=modelo-produtos.csv');

  // Add BOM for Excel to recognize UTF-8
  res.send('\ufeff' + csvHeader + csvExample);
}

// Import products from CSV
export async function importProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;

    if (!req.file) {
      throw createError('Arquivo CSV é obrigatório', 400);
    }

    // Read CSV content
    const csvContent = req.file.buffer.toString('utf-8');

    // Remove BOM if present
    const cleanContent = csvContent.replace(/^\ufeff/, '');

    // Split into lines
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      throw createError('Arquivo CSV deve ter cabeçalho e pelo menos uma linha de dados', 400);
    }

    // Verify header
    const header = lines[0].toLowerCase();
    if (!header.includes('nome') || !header.includes('preco')) {
      throw createError('Cabeçalho do CSV inválido. Use o modelo fornecido.', 400);
    }

    // Parse rows
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const columns = line.split(';');

        if (columns.length < 2) {
          results.errors.push(`Linha ${i + 1}: formato inválido`);
          continue;
        }

        const nome = columns[0]?.trim();
        const descricao = columns[1]?.trim() || null;
        const precoStr = columns[2]?.trim().replace(',', '.') || '0';
        const categoria = columns[3]?.trim() || null;
        const estoqueStr = columns[4]?.trim() || '0';
        const codigoBarras = columns[5]?.trim() || null;
        const ativoStr = columns[6]?.trim().toLowerCase() || 'sim';
        const imagem = columns[7]?.trim() || null;

        if (!nome) {
          results.errors.push(`Linha ${i + 1}: nome é obrigatório`);
          continue;
        }

        const preco = parseFloat(precoStr);
        if (isNaN(preco) || preco < 0) {
          results.errors.push(`Linha ${i + 1}: preço inválido`);
          continue;
        }

        const estoque = parseInt(estoqueStr, 10);
        const ativo = ativoStr === 'sim' || ativoStr === 'true' || ativoStr === '1';

        // Check if product exists by barcode (if provided) or by name
        let existingProduct = null;

        if (codigoBarras) {
          existingProduct = await prisma.product.findFirst({
            where: {
              storeId,
              barcode: codigoBarras,
            },
          });
        }

        if (!existingProduct) {
          existingProduct = await prisma.product.findFirst({
            where: {
              storeId,
              name: nome,
            },
          });
        }

        if (existingProduct) {
          // Update existing product
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: nome,
              description: descricao,
              price: preco,
              category: categoria,
              stock: isNaN(estoque) ? existingProduct.stock : estoque,
              barcode: codigoBarras,
              active: ativo,
              image: imagem || existingProduct.image,
            },
          });
          results.updated++;
        } else {
          // Create new product
          await prisma.product.create({
            data: {
              name: nome,
              description: descricao,
              price: preco,
              category: categoria,
              stock: isNaN(estoque) ? 0 : estoque,
              barcode: codigoBarras,
              active: ativo,
              image: imagem,
              storeId,
            },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Linha ${i + 1}: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
      }
    }

    res.json({
      success: true,
      message: `Importação concluída: ${results.created} criados, ${results.updated} atualizados`,
      created: results.created,
      updated: results.updated,
      errors: results.errors,
    });
  } catch (error) {
    next(error);
  }
}
