import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function analyzeUserBonuses(orderId: number) {
  console.log(`\n=== Анализ бонусов для заказа #${orderId} ===\n`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: true,
      referralEvents: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, bonusBalance: true },
          },
        },
      },
    },
  });

  if (!order || !order.userId) {
    console.log(`❌ Заказ #${orderId} не найден или нет пользователя`);
    await prisma.$disconnect();
    return;
  }

  const userId = order.userId;
  console.log(`👤 Пользователь: ${order.user?.name || order.user?.email || order.user?.phone} (ID: ${userId})`);
  console.log(`💳 Текущий баланс: ${order.user?.bonusBalance || 0} ₸\n`);

  // Получаем ВСЕ события пользователя
  const allUserEvents = await prisma.referralEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      order: {
        select: { id: true, status: true, totalAmount: true },
      },
    },
  });

  console.log(`📊 Всего событий пользователя: ${allUserEvents.length}\n`);

  // События до заказа #19
  const eventsBeforeOrder19 = allUserEvents.filter(
    (e) => !e.orderId || e.orderId !== orderId || e.createdAt < order.createdAt
  );

  // События связанные с заказом #19
  const order19Events = allUserEvents.filter(
    (e) => e.orderId === orderId
  );

  console.log(`📅 События ДО заказа #19: ${eventsBeforeOrder19.length}`);
  let balanceBeforeOrder19 = 0;
  eventsBeforeOrder19.forEach((e) => {
    balanceBeforeOrder19 += e.amount;
  });
  console.log(`   Баланс до заказа #19: ${balanceBeforeOrder19} ₸\n`);

  console.log(`📦 События по заказу #19 (${order19Events.length}):\n`);
  let order19Balance = 0;
  order19Events.forEach((event, index) => {
    const sign = event.amount >= 0 ? '+' : '';
    console.log(`${index + 1}. [${event.createdAt.toLocaleString('ru-RU')}] ${event.type}`);
    console.log(`   Сумма: ${sign}${event.amount} ₸`);
    console.log(`   Примечание: ${event.note || '-'}`);
    order19Balance += event.amount;
    console.log(`   Баланс после: ${balanceBeforeOrder19 + order19Balance} ₸\n`);
  });

  console.log(`💰 Итого по заказу #19: ${order19Balance >= 0 ? '+' : ''}${order19Balance} ₸`);
  console.log(`📊 Ожидаемый баланс: ${balanceBeforeOrder19 + order19Balance} ₸`);
  console.log(`💳 Фактический баланс: ${order.user?.bonusBalance || 0} ₸`);
  console.log(`🔍 Разница: ${(order.user?.bonusBalance || 0) - (balanceBeforeOrder19 + order19Balance)} ₸\n`);

  // Анализ заказа #19
  console.log(`\n📦 Детали заказа #19:`);
  console.log(`   Изначальная сумма: ${order.totalAmount} ₸`);
  console.log(`   Оплачено бонусами: ${order.bonusSpent} ₸`);
  console.log(`   Статус: ${order.status}`);
  console.log(`   Товары:`);
  order.items.forEach((item) => {
    console.log(`     - ${item.quantity} шт. × ${item.priceAtMoment} ₸ = ${item.subtotal} ₸`);
    console.log(`       Возвращено: ${item.returnedQuantity || 0} шт.`);
  });

  // Правильный расчет
  console.log(`\n✅ ПРАВИЛЬНЫЙ РАСЧЕТ:`);
  console.log(`   Изначально оплачено бонусами: 2000 ₸`);
  console.log(`   Начислено кэшбэка: +830 ₸`);
  console.log(`   Итого должно быть: ${balanceBeforeOrder19 - 2000 + 830} ₸`);
  
  // Если весь заказ возвращен
  const totalReturned = order.items.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalReturned === totalQuantity) {
    console.log(`\n   ⚠️ ВЕСЬ ЗАКАЗ ВОЗВРАЩЕН!`);
    console.log(`   Должно быть возвращено: +2000 ₸ (все потраченные бонусы)`);
    console.log(`   Должно быть списано: -830 ₸ (весь начисленный кэшбэк)`);
    console.log(`   Итого изменение: +1170 ₸`);
    console.log(`   Правильный баланс: ${balanceBeforeOrder19 - 2000 + 830 + 2000 - 830} = ${balanceBeforeOrder19} ₸`);
  }

  await prisma.$disconnect();
}

const orderId = process.argv[2] ? parseInt(process.argv[2], 10) : 19;
analyzeUserBonuses(orderId).catch(console.error);

