import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function fixOrder19Bonuses() {
  const orderId = 19;

  console.log(`\n=== Корректировка бонусов для заказа #${orderId} ===\n`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: true,
      referralEvents: {
        where: { orderId },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order || !order.userId) {
    console.log(`❌ Заказ #${orderId} не найден`);
    await prisma.$disconnect();
    return;
  }

  const userId = order.userId;
  const currentBalance = order.user?.bonusBalance || 0;

  console.log(`👤 Пользователь: ${order.user?.name || order.user?.email} (ID: ${userId})`);
  console.log(`💳 Текущий баланс: ${currentBalance} ₸\n`);

  // Получаем события ДО заказа #19
  const eventsBefore = await prisma.referralEvent.findMany({
    where: {
      userId,
      OR: [
        { orderId: null },
        { orderId: { not: orderId } },
        { createdAt: { lt: order.createdAt } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  let balanceBeforeOrder = 0;
  eventsBefore.forEach((e) => {
    balanceBeforeOrder += e.amount;
  });

  console.log(`📊 Баланс ДО заказа #19: ${balanceBeforeOrder} ₸`);

  // Правильный расчет
  // Изначально было: balanceBeforeOrder
  // Потрачено на заказ: -2000 (BONUS_SPENT)
  // Начислено кэшбэка: +830 (ORDER_BONUS)
  // Баланс после оплаты и кэшбэка: balanceBeforeOrder - 2000 + 830

  // Весь заказ возвращен (2 из 2 товаров)
  // Должно быть возвращено: +2000 (все потраченные бонусы)
  // Должно быть списано: -830 (весь начисленный кэшбэк)
  // Правильный баланс: balanceBeforeOrder - 2000 + 830 + 2000 - 830 = balanceBeforeOrder

  const correctBalance = balanceBeforeOrder;
  const difference = currentBalance - correctBalance;

  console.log(`\n✅ ПРАВИЛЬНЫЙ РАСЧЕТ:`);
  console.log(`   Баланс до заказа: ${balanceBeforeOrder} ₸`);
  console.log(`   Потрачено на заказ: -2000 ₸`);
  console.log(`   Начислено кэшбэка: +830 ₸`);
  console.log(`   Весь заказ возвращен:`);
  console.log(`     Возвращено бонусов: +2000 ₸`);
  console.log(`     Списано кэшбэка: -830 ₸`);
  console.log(`   Правильный баланс: ${correctBalance} ₸`);
  console.log(`\n💳 Текущий баланс: ${currentBalance} ₸`);
  console.log(`🔍 Разница: ${difference >= 0 ? '+' : ''}${difference} ₸`);

  if (Math.abs(difference) < 1) {
    console.log(`\n✅ Баланс уже правильный, корректировка не требуется`);
    await prisma.$disconnect();
    return;
  }

  // Корректируем баланс
  console.log(`\n🔧 Корректировка баланса...`);

  const result = await prisma.$transaction(async (tx) => {
    // Обновляем баланс пользователя
    await tx.user.update({
      where: { id: userId },
      data: { bonusBalance: correctBalance },
    });

    // Создаем событие о корректировке
    await tx.referralEvent.create({
      data: {
        userId,
        referredUserId: null,
        orderId,
        type: 'MANUAL_ADJUSTMENT',
        amount: -difference,
        note: `Корректировка баланса из-за ошибки в расчете возврата (заказ #${orderId}). Правильный баланс: ${correctBalance} ₸`,
      },
    });

    return { ok: true, correctBalance, difference };
  });

  console.log(`\n✅ Баланс скорректирован!`);
  console.log(`   Новый баланс: ${result.correctBalance} ₸`);
  console.log(`   Скорректировано: ${result.difference >= 0 ? '+' : ''}${result.difference} ₸`);

  // Проверяем итоговый баланс
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { bonusBalance: true },
  });

  console.log(`\n💳 Фактический баланс после корректировки: ${updatedUser?.bonusBalance || 0} ₸`);

  await prisma.$disconnect();
}

fixOrder19Bonuses().catch(console.error);

