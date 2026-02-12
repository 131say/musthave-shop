import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function recalculateOrder19Correctly() {
  const userId = 10;
  const orderId = 19;

  console.log(`\n=== Правильный пересчет заказа #19 ===\n`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referralEvents: {
        where: { userId },
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
    console.log(`❌ Не найдено`);
    await prisma.$disconnect();
    return;
  }

  console.log(`👤 Пользователь: ${user.name || user.email}`);
  console.log(`💳 Текущий баланс: ${user.bonusBalance} ₸\n`);

  // Находим баланс ДО заказа #19
  const eventsBeforeOrder19 = user.referralEvents.filter(
    (e) => !e.orderId || e.orderId !== orderId || e.createdAt < order.createdAt
  );

  let balanceBeforeOrder = 0;
  eventsBeforeOrder19.forEach((e) => {
    balanceBeforeOrder += e.amount;
  });

  console.log(`📊 Баланс ДО заказа #19: ${balanceBeforeOrder} ₸`);
  console.log(`📦 Заказ #19:`);
  console.log(`   Потрачено бонусов: 2000 ₸`);
  console.log(`   Товары: 2 шт. × 13830 ₸ = 27660 ₸`);
  console.log(`   Возвращено: 2 шт. (полный возврат)\n`);

  // Правильный расчет по новой логике
  console.log(`✅ ПРАВИЛЬНЫЙ РАСЧЕТ (по новой логике):`);
  console.log(`   1. Баланс до заказа: ${balanceBeforeOrder} ₸`);
  console.log(`   2. Потрачено на заказ: -2000 ₸`);
  console.log(`   3. Баланс после оплаты: ${balanceBeforeOrder - 2000} ₸`);
  console.log(`   4. Заказ выполнен - начислен кэшбэк: +830 ₸`);
  console.log(`   5. Баланс после кэшбэка: ${balanceBeforeOrder - 2000 + 830} ₸`);
  console.log(`\n   Возврат 1-го товара:`);
  console.log(`     - Бонусы НЕ возвращаются (остаются на 2-й товар)`);
  console.log(`     - Кэшбэк НЕ списывается (заказ еще не полностью возвращен)`);
  console.log(`     - Баланс не меняется: ${balanceBeforeOrder - 2000 + 830} ₸`);
  console.log(`\n   Возврат 2-го товара (полный возврат):`);
  console.log(`     - Возвращаются ВСЕ бонусы: +2000 ₸`);
  console.log(`     - Списывается ВЕСЬ кэшбэк: -830 ₸`);
  console.log(`     - Правильный баланс: ${balanceBeforeOrder - 2000 + 830 + 2000 - 830} = ${balanceBeforeOrder} ₸`);

  // Текущие события
  const order19Events = user.referralEvents.filter((e) => e.orderId === orderId);
  console.log(`\n📋 Текущие события по заказу #19 (${order19Events.length}):`);
  order19Events.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.type}: ${e.amount >= 0 ? '+' : ''}${e.amount} ₸ - ${e.note || ''}`);
  });

  const currentSum = order19Events.reduce((sum, e) => sum + e.amount, 0);
  console.log(`   Итого: ${currentSum >= 0 ? '+' : ''}${currentSum} ₸`);

  // Что нужно исправить
  console.log(`\n🔧 ЧТО НУЖНО ИСПРАВИТЬ:`);
  console.log(`   Текущий баланс: ${user.bonusBalance} ₸`);
  console.log(`   Правильный баланс: ${balanceBeforeOrder} ₸`);
  console.log(`   Разница: ${user.bonusBalance - balanceBeforeOrder} ₸`);
  
  // Нужно удалить неправильные события возврата и оставить только:
  // 1. ORDER_BONUS: +830 (кэшбэк)
  // 2. MANUAL_ADJUSTMENT: -830 (списание кэшбэка при полном возврате)
  // 3. MANUAL_ADJUSTMENT: +2000 (возврат всех бонусов при полном возврате)
  
  const wrongEvents = order19Events.filter((e) => 
    e.note?.includes('Возврат бонусов за возврат товаров') && e.amount === 1000 ||
    e.note?.includes('Списание бонусов за возврат товаров') && (e.amount === -415 || e.amount === -830 && e.note.includes('возврат товаров'))
  );

  console.log(`\n   Неправильные события, которые нужно удалить/отменить:`);
  wrongEvents.forEach((e) => {
    console.log(`     - ${e.type}: ${e.amount >= 0 ? '+' : ''}${e.amount} ₸ (ID: ${e.id})`);
  });

  await prisma.$disconnect();
}

recalculateOrder19Correctly().catch(console.error);

