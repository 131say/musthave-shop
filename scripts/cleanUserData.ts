import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function cleanUserData(userId: number) {
  console.log(`\n=== Очистка данных пользователя ID: ${userId} ===\n`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referralEvents: true,
      orders: {
        include: {
          items: true,
          referralEvents: true,
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
  console.log(`💳 Текущий баланс: ${user.bonusBalance} ₸`);
  console.log(`📊 Событий бонусов: ${user.referralEvents.length}`);
  console.log(`📦 Заказов: ${user.orders.length}\n`);

  const result = await prisma.$transaction(async (tx) => {
    // Удаляем все события бонусов пользователя
    const deletedEvents = await tx.referralEvent.deleteMany({
      where: { userId },
    });
    console.log(`✅ Удалено событий бонусов: ${deletedEvents.count}`);

    // Удаляем заказы пользователя (каскадно удалятся items и связанные события)
    for (const order of user.orders) {
      // Сначала удаляем связанные события заказа
      await tx.referralEvent.deleteMany({
        where: { orderId: order.id },
      });
      
      // Удаляем товары заказа
      await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });
      
      // Удаляем заказ
      await tx.order.delete({
        where: { id: order.id },
      });
      console.log(`✅ Удален заказ #${order.id}`);
    }

    // Обнуляем баланс бонусов
    await tx.user.update({
      where: { id: userId },
      data: { bonusBalance: 0 },
    });
    console.log(`✅ Баланс бонусов обнулен`);

    return { deletedEvents: deletedEvents.count, deletedOrders: user.orders.length };
  });

  // Проверяем результат
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referralEvents: true,
      orders: true,
    },
  });

  console.log(`\n📊 Результат:`);
  console.log(`   💳 Баланс: ${updatedUser?.bonusBalance || 0} ₸`);
  console.log(`   📊 Событий: ${updatedUser?.referralEvents.length || 0}`);
  console.log(`   📦 Заказов: ${updatedUser?.orders.length || 0}`);

  await prisma.$disconnect();
}

const userId = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
cleanUserData(userId).catch(console.error);

