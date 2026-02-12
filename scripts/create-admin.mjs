#!/usr/bin/env node

/**
 * Скрипт для создания администратора
 * 
 * Использование:
 *   node scripts/create-admin.mjs <login> <password>
 * 
 * Пример:
 *   node scripts/create-admin.mjs admin "MustHaveAdmin#2026"
 * 
 * Требования к паролю:
 * - Минимум 12 символов
 * - Рекомендуется: буквы, цифры, спецсимволы
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Ошибка: требуется логин и пароль');
    console.log('\nИспользование:');
    console.log('  node scripts/create-admin.mjs <login> <password>');
    console.log('\nПример:');
    console.log('  node scripts/create-admin.mjs admin "MySecurePassword123!"');
    process.exit(1);
  }

  const login = args[0].trim().toLowerCase();
  const password = args[1];

  // Валидация логина
  if (!login || login.length < 2) {
    console.error('❌ Ошибка: логин должен быть не менее 2 символов');
    process.exit(1);
  }

  // Валидация пароля
  if (password.length < 12) {
    console.error('❌ Ошибка: пароль должен быть не менее 12 символов');
    process.exit(1);
  }

  try {
    // Проверяем, существует ли пользователь с таким логином
    const existing = await prisma.user.findUnique({
      where: { login },
    });

    if (existing) {
      // Обновляем существующего пользователя
      const passwordHash = await bcrypt.hash(password, 12);
      
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          passwordHash,
        },
      });

      console.log(`✅ Пользователь "${login}" обновлён и назначен администратором`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Роль: ADMIN`);
    } else {
      // Создаём нового администратора
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Генерируем referralCode
      const last = await prisma.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const nextNum = (last?.id ?? 0) + 1000;
      const referralCode = `SAY${nextNum}`;

      const user = await prisma.user.create({
        data: {
          login,
          phone: null, // Админ не использует телефон для входа
          name: null,
          address: null,
          role: 'ADMIN',
          referralCode,
          bonusBalance: 0,
          slotsTotal: 1,
          passwordHash,
        },
      });

      console.log(`✅ Администратор "${login}" успешно создан`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Роль: ADMIN`);
      console.log(`   Referral Code: ${referralCode}`);
    }

    console.log('\n📝 Вход в админку:');
    console.log(`   URL: http://localhost:3000/admin/login`);
    console.log(`   Логин: ${login}`);
    console.log(`   Пароль: ${'*'.repeat(password.length)}`);
  } catch (error) {
    console.error('❌ Ошибка при создании администратора:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
