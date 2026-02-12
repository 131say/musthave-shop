import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function checkOrderBonuses(orderId: number) {
  console.log(`\n=== Проверка движений бонусов для заказа #${orderId} ===\n`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: true },
      },
      user: {
        include: { referredBy: true },
      },
      referralEvents: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          referredUser: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      },
    },
  });

  if (!order) {
    console.log(`❌ Заказ #${orderId} не найден`);
    await prisma.$disconnect();
    return;
  }

  console.log(`📦 Заказ #${orderId}`);
  console.log(`   Статус: ${order.status}`);
  console.log(`   Клиент: ${order.user?.name || order.customerName} (ID: ${order.userId || 'N/A'})`);
  console.log(`   Общая сумма: ${order.totalAmount} ₸`);
  console.log(`   Оплачено бонусами: ${order.bonusSpent} ₸`);
  console.log(`   Оплачено наличными: ${order.cashPaid} ₸`);
  console.log(`   Дата создания: ${order.createdAt.toLocaleString('ru-RU')}`);

  console.log(`\n📋 Товары в заказе:`);
  order.items.forEach((item) => {
    console.log(`   - ${item.product.name}`);
    console.log(`     Куплено: ${item.quantity} шт. × ${item.priceAtMoment} ₸ = ${item.subtotal} ₸`);
    console.log(`     Возвращено: ${item.returnedQuantity || 0} шт.`);
    console.log(`     Доступно для возврата: ${item.quantity - (item.returnedQuantity || 0)} шт.`);
  });

  console.log(`\n💰 Движения бонусов (всего событий: ${order.referralEvents.length}):\n`);

  let totalBonusFlow = 0;
  order.referralEvents.forEach((event, index) => {
    const sign = event.amount >= 0 ? '+' : '';
    const userInfo = event.user ? `${event.user.name || event.user.email || event.user.phone || `ID:${event.user.id}`}` : `ID:${event.userId}`;
    const referredInfo = event.referredUser ? ` (приглашенный: ${event.referredUser.name || event.referredUser.email || event.referredUser.phone || `ID:${event.referredUser.id}`})` : '';
    
    console.log(`${index + 1}. [${event.createdAt.toLocaleString('ru-RU')}] ${event.type}`);
    console.log(`   Пользователь: ${userInfo}${referredInfo}`);
    console.log(`   Сумма: ${sign}${event.amount} ₸`);
    console.log(`   Примечание: ${event.note || '-'}`);
    console.log(`   Заказ: ${event.orderId || 'N/A'}`);
    totalBonusFlow += event.amount;
    console.log('');
  });

  console.log(`📊 Итого движение бонусов: ${totalBonusFlow >= 0 ? '+' : ''}${totalBonusFlow} ₸`);

  // Проверяем баланс пользователя
  if (order.userId) {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { bonusBalance: true },
    });
    console.log(`\n💳 Текущий баланс бонусов клиента: ${user?.bonusBalance || 0} ₸`);
  }

  // Анализ возвратов
  const returnEvents = order.referralEvents.filter(
    (e) => e.note?.includes('возврат') || e.note?.includes('Возврат')
  );
  if (returnEvents.length > 0) {
    console.log(`\n🔄 Анализ возвратов:`);
    returnEvents.forEach((event) => {
      console.log(`   - ${event.note}: ${event.amount >= 0 ? '+' : ''}${event.amount} ₸`);
    });
  }

  await prisma.$disconnect();
}

const orderId = process.argv[2] ? parseInt(process.argv[2], 10) : 19;
checkOrderBonuses(orderId).catch(console.error);

