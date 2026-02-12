import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function fixOrder21Cashback() {
  const orderId = 21;

  console.log(`\n=== Исправление кэшбэка для заказа #${orderId} ===\n`);

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true,
        referralEvents: {
          where: { orderId, type: 'ORDER_BONUS' },
        },
      },
    });

    if (!order || !order.userId) {
      throw new Error('Order not found');
    }

    console.log(`👤 Пользователь: ${order.user?.name || order.user?.email} (ID: ${order.userId})`);
    console.log(`💳 Текущий баланс: ${order.user?.bonusBalance || 0} ₸`);

    // Проверяем, был ли уже списан кэшбэк
    const existingDeduction = await tx.referralEvent.findFirst({
      where: {
        orderId,
        type: 'MANUAL_ADJUSTMENT',
        note: { contains: 'Списание кэшбэка за возвращенные товары' },
      },
    });

    if (existingDeduction) {
      console.log(`\n⚠️ Кэшбэк уже был списан ранее`);
      return { alreadyFixed: true };
    }

    const originalTotalAmount = 42430; // Из заказа
    const returnAmount = 15040; // Возвращенный товар
    const cashbackAmount = order.referralEvents[0]?.amount || 0;

    console.log(`\n📦 Детали заказа:`);
    console.log(`   Общая сумма: ${originalTotalAmount} ₸`);
    console.log(`   Возвращено товаров на сумму: ${returnAmount} ₸`);
    console.log(`   Начисленный кэшбэк: ${cashbackAmount} ₸`);

    // Рассчитываем долю возврата
    const returnRatio = returnAmount / originalTotalAmount;
    const cashbackToDeduct = Math.round(cashbackAmount * returnRatio);

    console.log(`\n💰 Расчет:`);
    console.log(`   Доля возврата: ${(returnRatio * 100).toFixed(2)}%`);
    console.log(`   Кэшбэк к списанию: ${cashbackToDeduct} ₸`);

    if (cashbackToDeduct > 0) {
      // Списываем кэшбэк
      await tx.user.update({
        where: { id: order.userId },
        data: { bonusBalance: { decrement: cashbackToDeduct } },
      });

      await tx.referralEvent.create({
        data: {
          userId: order.userId,
          referredUserId: null,
          orderId,
          type: 'MANUAL_ADJUSTMENT',
          amount: -cashbackToDeduct,
          note: `Списание кэшбэка за возвращенные товары (заказ #${orderId})`,
        },
      });

      console.log(`\n✅ Кэшбэк списан: -${cashbackToDeduct} ₸`);
    }

    const updatedUser = await tx.user.findUnique({
      where: { id: order.userId },
      select: { bonusBalance: true },
    });

    return { cashbackToDeduct, newBalance: updatedUser?.bonusBalance || 0 };
  });

  if (!result.alreadyFixed) {
    console.log(`\n💳 Новый баланс: ${result.newBalance} ₸`);
  }

  await prisma.$disconnect();
}

fixOrder21Cashback().catch(console.error);

