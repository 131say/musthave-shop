import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function fixOrder19Final() {
  const userId = 10;
  const orderId = 19;

  console.log(`\n=== Финальная корректировка заказа #19 ===\n`);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        referralEvents: {
          where: { orderId },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Находим баланс ДО заказа #19
    const eventsBefore = await tx.referralEvent.findMany({
      where: {
        userId,
        OR: [
          { orderId: null },
          { orderId: { not: orderId } },
          { createdAt: { lt: user.referralEvents[0]?.createdAt || new Date() } },
        ],
      },
    });

    let balanceBefore = 0;
    eventsBefore.forEach((e) => {
      balanceBefore += e.amount;
    });

    console.log(`📊 Баланс ДО заказа #19: ${balanceBefore} ₸`);
    console.log(`💳 Текущий баланс: ${user.bonusBalance} ₸\n`);

    // Удаляем неправильные события возврата
    const wrongEventIds = [21, 22, 23, 24]; // ID неправильных событий
    let deletedSum = 0;

    for (const eventId of wrongEventIds) {
      const event = await tx.referralEvent.findUnique({
        where: { id: eventId },
      });
      if (event && event.orderId === orderId) {
        deletedSum += event.amount;
        await tx.referralEvent.delete({
          where: { id: eventId },
        });
        console.log(`   Удалено событие ID ${eventId}: ${event.amount >= 0 ? '+' : ''}${event.amount} ₸`);
      }
    }

    // Проверяем событие #20 (списание кэшбэка при отмене)
    const event20 = await tx.referralEvent.findUnique({
      where: { id: 20 },
    });

    if (event20 && event20.note?.includes('отмену выполненного заказа')) {
      // Это событие было создано при отмене, но по новой логике нужно списать кэшбэк только при полном возврате
      // Оставляем его, так как заказ полностью возвращен
      console.log(`   Событие #20 оставлено: списание кэшбэка при полном возврате`);
    }

    // Создаем правильное событие возврата всех бонусов при полном возврате
    const hasFullReturnEvent = await tx.referralEvent.findFirst({
      where: {
        orderId,
        note: { contains: 'Возврат всех бонусов при полном возврате' },
      },
    });

    if (!hasFullReturnEvent) {
      await tx.referralEvent.create({
        data: {
          userId,
          referredUserId: null,
          orderId,
          type: 'MANUAL_ADJUSTMENT',
          amount: 2000,
          note: `Возврат всех бонусов при полном возврате заказа (заказ #${orderId})`,
        },
      });
      console.log(`   Создано событие: возврат всех бонусов +2000 ₸`);
    }

    // Пересчитываем баланс
    const allEvents = await tx.referralEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    let newBalance = 0;
    allEvents.forEach((e) => {
      newBalance += e.amount;
    });

    // Обновляем баланс пользователя
    await tx.user.update({
      where: { id: userId },
      data: { bonusBalance: newBalance },
    });

    console.log(`\n✅ Баланс скорректирован:`);
    console.log(`   Новый баланс: ${newBalance} ₸`);
    console.log(`   Правильный баланс должен быть: ${balanceBefore} ₸`);

    return { newBalance, balanceBefore };
  });

  console.log(`\n💳 Финальный баланс: ${result.newBalance} ₸`);
  await prisma.$disconnect();
}

fixOrder19Final().catch(console.error);

