// Скрипт для исправления cashPaid в существующих заказах
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

async function fixCashPaid() {
  console.log('Начинаем исправление cashPaid...');

  // Получаем все заказы и проверяем, нужно ли исправить cashPaid
  const orders = await prisma.order.findMany();

  console.log(`Найдено заказов для исправления: ${orders.length}`);

  let fixed = 0;
  for (const order of orders) {
    const correctCashPaid = Math.max(0, order.totalAmount - (order.bonusSpent || 0));
    
    if (correctCashPaid !== order.cashPaid) {
      await prisma.order.update({
        where: { id: order.id },
        data: { cashPaid: correctCashPaid },
      });
      fixed++;
      console.log(`Заказ #${order.id}: cashPaid исправлен с ${order.cashPaid} на ${correctCashPaid}`);
    }
  }

  console.log(`Исправлено заказов: ${fixed}`);
  console.log('Готово!');
}

fixCashPaid()
  .catch((e) => {
    console.error('Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

