import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create stores
  const mercadoCentral = await prisma.store.upsert({
    where: { slug: 'mercado-central' },
    update: {},
    create: {
      slug: 'mercado-central',
      name: 'Mercado Central',
      primaryColor: '#16a34a', // green
      logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200',
    },
  });

  const superBom = await prisma.store.upsert({
    where: { slug: 'superbom' },
    update: {},
    create: {
      slug: 'superbom',
      name: 'SuperBom Express',
      primaryColor: '#dc2626', // red
      logo: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200',
    },
  });

  console.log('Stores created:', mercadoCentral.name, superBom.name);

  // Create super admin user with requested credentials
  const superAdminPassword = await bcrypt.hash('4d4pt400', 10);
  await prisma.user.upsert({
    where: { email: 'rafael@ruch.com.br' },
    update: {
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'rafael@ruch.com.br',
      password: superAdminPassword,
      name: 'Rafael - Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  // Create admin for Mercado Central
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@mercadocentral.com' },
    update: {},
    create: {
      email: 'admin@mercadocentral.com',
      password: adminPassword,
      name: 'Admin Mercado Central',
      role: 'ADMIN',
      storeId: mercadoCentral.id,
    },
  });

  // Create admin for SuperBom
  await prisma.user.upsert({
    where: { email: 'admin@superbom.com' },
    update: {},
    create: {
      email: 'admin@superbom.com',
      password: adminPassword,
      name: 'Admin SuperBom',
      role: 'ADMIN',
      storeId: superBom.id,
    },
  });

  // Products for Mercado Central
  const productsMercadoCentral = [
    {
      name: 'Coca-Cola 350ml',
      description: 'Refrigerante Coca-Cola lata 350ml',
      price: 5.99,
      category: 'Bebidas',
      stock: 100,
      barcode: '7894900010015',
      image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Guarana Antarctica 2L',
      description: 'Refrigerante Guarana Antarctica garrafa 2 litros',
      price: 8.99,
      category: 'Bebidas',
      stock: 50,
      barcode: '7891991010856',
      image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Agua Mineral 500ml',
      description: 'Agua mineral sem gas 500ml',
      price: 2.50,
      category: 'Bebidas',
      stock: 200,
      barcode: '7896065876123',
      image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Pao de Queijo (6 unidades)',
      description: 'Pao de queijo mineiro congelado',
      price: 12.90,
      category: 'Lanches',
      stock: 30,
      barcode: '7896102500123',
      image: 'https://images.unsplash.com/photo-1598733753831-7a5bc9c5ad78?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Coxinha de Frango',
      description: 'Coxinha de frango com catupiry',
      price: 6.50,
      category: 'Lanches',
      stock: 25,
      barcode: '7896102500130',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Chocolate ao Leite 90g',
      description: 'Barra de chocolate ao leite',
      price: 8.90,
      category: 'Doces',
      stock: 60,
      barcode: '7891000100103',
      image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Arroz Branco 5kg',
      description: 'Arroz branco tipo 1',
      price: 24.90,
      category: 'Mercearia',
      stock: 45,
      barcode: '7896006752158',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
      storeId: mercadoCentral.id,
    },
    {
      name: 'Feijao Carioca 1kg',
      description: 'Feijao carioca tipo 1',
      price: 8.90,
      category: 'Mercearia',
      stock: 55,
      barcode: '7896006762157',
      image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400',
      storeId: mercadoCentral.id,
    },
  ];

  // Products for SuperBom (different prices)
  const productsSuperBom = [
    {
      name: 'Coca-Cola 350ml',
      description: 'Refrigerante Coca-Cola lata 350ml',
      price: 5.49,
      category: 'Bebidas',
      stock: 150,
      barcode: '7894900010015',
      image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400',
      storeId: superBom.id,
    },
    {
      name: 'Guarana Antarctica 2L',
      description: 'Refrigerante Guarana Antarctica garrafa 2 litros',
      price: 7.99,
      category: 'Bebidas',
      stock: 80,
      barcode: '7891991010856',
      image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400',
      storeId: superBom.id,
    },
    {
      name: 'Suco de Laranja 1L',
      description: 'Suco de laranja integral 1 litro',
      price: 8.90,
      category: 'Bebidas',
      stock: 40,
      barcode: '7891000053508',
      image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400',
      storeId: superBom.id,
    },
    {
      name: 'Empada de Palmito',
      description: 'Empada recheada com palmito',
      price: 6.50,
      category: 'Lanches',
      stock: 20,
      barcode: '7896102500147',
      image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400',
      storeId: superBom.id,
    },
    {
      name: 'Bala de Goma 500g',
      description: 'Balas de goma sortidas',
      price: 14.90,
      category: 'Doces',
      stock: 35,
      barcode: '7896019607018',
      image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400',
      storeId: superBom.id,
    },
    {
      name: 'Biscoito Recheado',
      description: 'Biscoito recheado sabor chocolate',
      price: 3.99,
      category: 'Doces',
      stock: 80,
      barcode: '7891000305102',
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
      storeId: superBom.id,
    },
  ];

  // Insert products (skip if already exists)
  for (const product of [...productsMercadoCentral, ...productsSuperBom]) {
    const existing = await prisma.product.findFirst({
      where: {
        barcode: product.barcode,
        storeId: product.storeId,
      },
    });

    if (!existing) {
      await prisma.product.create({
        data: product,
      });
    }
  }

  console.log('Database seeded successfully!');
  console.log('');
  console.log('=== Credenciais ===');
  console.log('Super Admin: rafael@ruch.com.br / 4d4pt400');
  console.log('Admin Mercado Central: admin@mercadocentral.com / admin123');
  console.log('Admin SuperBom: admin@superbom.com / admin123');
  console.log('');
  console.log('=== Lojas ===');
  console.log('Mercado Central: /mercado-central');
  console.log('SuperBom Express: /superbom');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
