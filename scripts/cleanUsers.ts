// scripts/cleanUsers.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

function refCode(prefix: string) {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

async function main() {
  console.log('🧹 Начинаю очистку пользователей...');

  // Удаляем все связанные данные в правильном порядке
  console.log('  → Удаляю элементы заказов...');
  await prisma.orderItem.deleteMany({});

  console.log('  → Удаляю реферальные события...');
  await prisma.referralEvent.deleteMany({});

  console.log('  → Удаляю отзывы...');
  await prisma.review.deleteMany({});

  console.log('  → Удаляю заказы...');
  await prisma.order.deleteMany({});

  // Удаляем всех пользователей
  console.log('  → Удаляю всех пользователей...');
  const deletedCount = await prisma.user.deleteMany({});
  console.log(`  ✅ Удалено пользователей: ${deletedCount.count}`);

  // Создаем admin/admin
  console.log('  → Создаю admin/admin...');
  const adminPasswordHash = await bcrypt.hash('admin', 10);
  await prisma.user.create({
    data: {
      login: 'admin',
      phone: 'admin',
      name: 'admin',
      email: null,
      referralCode: refCode('ADM'),
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      bonusBalance: 0,
      slotsTotal: 1,
      slotsUsed: 0,
    },
  });
  console.log('  ✅ Создан: admin/admin (ADMIN)');

  // Создаем client/client
  console.log('  → Создаю client/client...');
  const clientPasswordHash = await bcrypt.hash('client', 10);
  await prisma.user.create({
    data: {
      login: 'client',
      phone: 'client',
      name: 'client',
      email: null,
      referralCode: refCode('CLT'),
      passwordHash: clientPasswordHash,
      role: 'CUSTOMER',
      bonusBalance: 0,
      slotsTotal: 1,
      slotsUsed: 0,
    },
  });
  console.log('  ✅ Создан: client/client (CUSTOMER)');

  console.log('✅ Очистка завершена! Остались только admin/admin и client/client');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

