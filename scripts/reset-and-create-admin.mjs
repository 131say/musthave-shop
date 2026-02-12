#!/usr/bin/env node

/**
 * Скрипт для удаления всех пользователей и создания админа
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Удаляю всех пользователей...');

  try {
    // Удаляем все связанные данные в правильном порядке
    console.log('  → Удаляю элементы заказов...');
    await prisma.orderItem.deleteMany({});

    console.log('  → Удаляю реферальные события...');
    await prisma.referralEvent.deleteMany({});

    console.log('  → Удаляю отзывы...');
    await prisma.review.deleteMany({});

    console.log('  → Удаляю заказы...');
    await prisma.order.deleteMany({});

    console.log('  → Удаляю wishlist...');
    await prisma.wishlist.deleteMany({});

    console.log('  → Удаляю support messages...');
    await prisma.supportMessage.deleteMany({});

    console.log('  → Удаляю support chats...');
    await prisma.supportChat.deleteMany({});

    // Удаляем всех пользователей
    console.log('  → Удаляю всех пользователей...');
    const deletedCount = await prisma.user.deleteMany({});
    console.log(`  ✅ Удалено пользователей: ${deletedCount.count}`);

    // Создаём админа albina131\albina888
    console.log('\n👤 Создаю администратора albina131...');
    const passwordHash = await bcrypt.hash('albina888', 12);
    
    const user = await prisma.user.create({
      data: {
        login: 'albina131',
        phone: null, // Админ не использует телефон для входа
        name: null,
        address: null,
        role: 'ADMIN',
        referralCode: 'SAY1000',
        bonusBalance: 0,
        slotsTotal: 1,
        passwordHash,
      },
    });

    console.log(`✅ Администратор создан:`);
    console.log(`   Логин: albina131`);
    console.log(`   Пароль: albina888`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Роль: ADMIN`);
    console.log(`\n📝 Вход в админку:`);
    console.log(`   URL: http://localhost:3000/admin/login`);
    console.log(`   Логин: albina131`);
    console.log(`   Пароль: albina888`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
