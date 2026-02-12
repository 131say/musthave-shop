import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function checkFullUserHistory(userId: number) {
  console.log(`\n=== Полная история бонусов пользователя ID: ${userId} ===\n`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referralEvents: {
        orderBy: { createdAt: 'asc' },
        include: {
          order: {
            select: { id: true, status: true, totalAmount: true, bonusSpent: true },
          },
        },
      },
    },
  });

  if (!user) {
    console.log(`❌ Пользователь не найден`);
    await prisma.$disconnect();
    return;
  }

  console.log(`👤 Пользователь: ${user.name || user.email || user.phone}`);
  console.log(`💳 Текущий баланс: ${user.bonusBalance} ₸\n`);

  console.log(`📊 Все события (${user.referralEvents.length}):\n`);

  let runningBalance = 0;
  user.referralEvents.forEach((event, index) => {
    const sign = event.amount >= 0 ? '+' : '';
    runningBalance += event.amount;
    
    console.log(`${index + 1}. [${event.createdAt.toLocaleString('ru-RU')}] ${event.type}`);
    console.log(`   Сумма: ${sign}${event.amount} ₸`);
    console.log(`   Примечание: ${event.note || '-'}`);
    if (event.orderId) {
      console.log(`   Заказ: #${event.orderId} (${event.order?.status || 'N/A'})`);
    }
    console.log(`   Баланс после: ${runningBalance} ₸`);
    console.log('');
  });

  console.log(`\n📊 Итого по всем событиям: ${runningBalance >= 0 ? '+' : ''}${runningBalance} ₸`);
  console.log(`💳 Текущий баланс в БД: ${user.bonusBalance} ₸`);
  
  // Если баланс не сходится, значит был начальный баланс
  const initialBalance = user.bonusBalance - runningBalance;
  if (Math.abs(initialBalance) > 0.01) {
    console.log(`\n💡 Начальный баланс (до всех событий): ${initialBalance} ₸`);
    console.log(`   Проверка: ${initialBalance} + ${runningBalance} = ${initialBalance + runningBalance} ₸`);
  }

  // Анализ заказа #19
  const order19Events = user.referralEvents.filter((e) => e.orderId === 19);
  if (order19Events.length > 0) {
    console.log(`\n📦 События по заказу #19 (${order19Events.length}):`);
    let order19Sum = 0;
    order19Events.forEach((e) => {
      order19Sum += e.amount;
      console.log(`   ${e.type}: ${e.amount >= 0 ? '+' : ''}${e.amount} ₸ - ${e.note || ''}`);
    });
    console.log(`   Итого: ${order19Sum >= 0 ? '+' : ''}${order19Sum} ₸`);
  }

  await prisma.$disconnect();
}

const userId = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
checkFullUserHistory(userId).catch(console.error);

