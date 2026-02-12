// scripts/clearAllData.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

function refCode(prefix: string) {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

async function main() {
  console.log('🧹 Начинаю полную очистку базы данных...');

  // Удаляем все данные в правильном порядке (с учетом foreign keys)
  
  console.log('  → Удаляю связи товаров с атрибутами...');
  await prisma.productAttribute.deleteMany({});

  console.log('  → Удаляю связи товаров с категориями...');
  await prisma.productCategory.deleteMany({});

  console.log('  → Удаляю избранное...');
  await prisma.wishlist.deleteMany({});

  console.log('  → Удаляю отзывы...');
  await prisma.review.deleteMany({});

  console.log('  → Удаляю элементы заказов...');
  await prisma.orderItem.deleteMany({});

  console.log('  → Удаляю реферальные события...');
  await prisma.referralEvent.deleteMany({});

  console.log('  → Удаляю сообщения поддержки...');
  await prisma.supportMessage.deleteMany({});

  console.log('  → Удаляю чаты поддержки...');
  await prisma.supportChat.deleteMany({});

  console.log('  → Удаляю заказы...');
  await prisma.order.deleteMany({});

  console.log('  → Удаляю пользователей...');
  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`  ✅ Удалено пользователей: ${deletedUsers.count}`);

  console.log('  → Удаляю товары...');
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`  ✅ Удалено товаров: ${deletedProducts.count}`);

  console.log('  → Удаляю бренды...');
  const deletedBrands = await prisma.brand.deleteMany({});
  console.log(`  ✅ Удалено брендов: ${deletedBrands.count}`);

  console.log('  → Удаляю значения атрибутов...');
  await prisma.attributeValue.deleteMany({});

  console.log('  → Удаляю группы атрибутов...');
  await prisma.attributeGroup.deleteMany({});

  console.log('  → Удаляю категории...');
  const deletedCategories = await prisma.category.deleteMany({});
  console.log(`  ✅ Удалено категорий: ${deletedCategories.count}`);

  console.log('  → Удаляю новости...');
  const deletedNews = await prisma.newsPost.deleteMany({});
  console.log(`  ✅ Удалено новостей: ${deletedNews.count}`);

  // AppSettings не удаляем - это настройки системы

  console.log('  → Сбрасываю AUTOINCREMENT счетчики...');
  await prisma.$executeRaw`DELETE FROM sqlite_sequence`;
  console.log('  ✅ Счетчики сброшены (новые записи начнутся с 1)');

  console.log('\n👤 Создаю админа...');
  const adminPasswordHash = await bcrypt.hash('Sayana313#', 10);
  const admin = await prisma.user.create({
    data: {
      login: '131say',
      phone: '131say',
      name: 'Admin',
      email: null,
      referralCode: refCode('ADM'),
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      bonusBalance: 0,
      slotsTotal: 1,
      slotsUsed: 0,
    },
  });
  console.log(`  ✅ Создан админ: ${admin.login} (пароль: Sayana313#)`);

  console.log('\n✅ Полная очистка завершена! База данных пуста, создан только админ.');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
