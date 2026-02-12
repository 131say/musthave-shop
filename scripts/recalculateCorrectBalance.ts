import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function recalculateCorrectBalance() {
  const userId = 10;
  const orderId = 19;

  console.log(`\n=== Пересчет правильного баланса для пользователя ID: ${userId} ===\n`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referralEvents: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!user || !order) {
    console.log(`❌ Пользователь или заказ не найдены`);
    await prisma.$disconnect();
    return;
  }

  console.log(`👤 Пользователь: ${user.name || user.email}`);
  console.log(`💳 Текущий баланс: ${user.bonusBalance} ₸\n`);

  // Находим все события ДО заказа #19
  const eventsBeforeOrder19 = user.referralEvents.filter(
    (e) => !e.orderId || e.orderId !== orderId || e.createdAt < order.createdAt
  );

  // События по заказу #19 (кроме корректировок)
  const order19Events = user.referralEvents.filter(
    (e) => e.orderId === orderId && !e.note?.includes('Корректировка')
  );

  console.log(`📊 События ДО заказа #19: ${eventsBeforeOrder19.length}`);
  let balanceBeforeOrder = 0;
  eventsBeforeOrder19.forEach((e) => {
    balanceBeforeOrder += e.amount;
  });
  console.log(`   Баланс до заказа #19: ${balanceBeforeOrder} ₸\n`);

  console.log(`📦 Заказ #19:`);
  console.log(`   Изначальная сумма: ${order.totalAmount} ₸`);
  console.log(`   Оплачено бонусами: 2000 ₸ (из BONUS_SPENT)`);
  console.log(`   Товары:`);
  order.items.forEach((item) => {
    console.log(`     - ${item.quantity} шт. × ${item.priceAtMoment} ₸ = ${item.subtotal} ₸`);
    console.log(`       Возвращено: ${item.returnedQuantity || 0} шт.`);
  });

  const totalReturned = order.items.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const isFullyReturned = totalReturned === totalQuantity;

  console.log(`\n   Весь заказ возвращен: ${isFullyReturned ? 'ДА' : 'НЕТ'}`);

  // Правильный расчет
  console.log(`\n✅ ПРАВИЛЬНЫЙ РАСЧЕТ:`);
  console.log(`   Баланс до заказа: ${balanceBeforeOrder} ₸`);
  console.log(`   Потрачено на заказ: -2000 ₸`);
  console.log(`   Начислено кэшбэка: +830 ₸`);
  
  if (isFullyReturned) {
    console.log(`\n   Весь заказ возвращен:`);
    console.log(`     Возвращено бонусов: +2000 ₸ (все потраченные)`);
    console.log(`     Списано кэшбэка: -830 ₸ (весь начисленный)`);
    console.log(`     Итого изменение: +1170 ₸`);
    const correctBalance = balanceBeforeOrder - 2000 + 830 + 2000 - 830;
    console.log(`\n   Правильный баланс: ${balanceBeforeOrder} - 2000 + 830 + 2000 - 830 = ${correctBalance} ₸`);
  } else {
    // Частичный возврат - нужно пересчитать правильно
    const originalTotalAmount = 27660; // 2 шт × 13830
    const returnAmount = order.items.reduce((sum, item) => {
      return sum + (item.priceAtMoment * (item.returnedQuantity || 0));
    }, 0);
    const returnRatio = returnAmount / originalTotalAmount;
    
    const bonusToReturn = Math.round(2000 * returnRatio);
    const cashbackToDeduct = Math.round(830 * returnRatio);
    
    console.log(`\n   Частичный возврат:`);
    console.log(`     Возвращено товаров на сумму: ${returnAmount} ₸`);
    console.log(`     Доля возврата: ${(returnRatio * 100).toFixed(2)}%`);
    console.log(`     Возвращено бонусов: +${bonusToReturn} ₸`);
    console.log(`     Списано кэшбэка: -${cashbackToDeduct} ₸`);
    const correctBalance = balanceBeforeOrder - 2000 + 830 + bonusToReturn - cashbackToDeduct;
    console.log(`\n   Правильный баланс: ${balanceBeforeOrder} - 2000 + 830 + ${bonusToReturn} - ${cashbackToDeduct} = ${correctBalance} ₸`);
  }

  // Текущие события по заказу #19
  console.log(`\n📋 Текущие события по заказу #19:`);
  order19Events.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.type}: ${e.amount >= 0 ? '+' : ''}${e.amount} ₸ - ${e.note || ''}`);
  });

  const currentOrder19Sum = order19Events.reduce((sum, e) => sum + e.amount, 0);
  console.log(`   Итого: ${currentOrder19Sum >= 0 ? '+' : ''}${currentOrder19Sum} ₸`);

  await prisma.$disconnect();
}

recalculateCorrectBalance().catch(console.error);

