#!/usr/bin/env node

/**
 * Подготовка БД к выкладке: полная очистка + только два админа.
 * Запуск: node scripts/reset-for-production.mjs
 *
 * Админы после выполнения:
 *   1) логин: 131say   пароль: Sayana313#
 *   2) логин: Albina   пароль: Saya313#
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL is required. Example: DATABASE_URL='postgresql://...' node scripts/reset-for-production.mjs");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: dbUrl,
  ssl: dbUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

const ADMINS = [
  { login: "131say", password: "Sayana313#" },
  { login: "albina", password: "Saya313#" },
];

async function main() {
  console.log("🧹 Полная очистка БД для выкладки...\n");

  await prisma.$transaction(async (tx) => {
    console.log("  → Связи товаров с атрибутами...");
    await tx.productAttribute.deleteMany({});

    console.log("  → Связи товаров с категориями...");
    await tx.productCategory.deleteMany({});

    console.log("  → Избранное...");
    await tx.wishlist.deleteMany({});

    console.log("  → Отзывы...");
    await tx.review.deleteMany({});

    console.log("  → Элементы заказов...");
    await tx.orderItem.deleteMany({});

    console.log("  → Реферальные события...");
    await tx.referralEvent.deleteMany({});

    console.log("  → Сообщения поддержки...");
    await tx.supportMessage.deleteMany({});

    console.log("  → Чаты поддержки...");
    await tx.supportChat.deleteMany({});

    console.log("  → Заказы...");
    await tx.order.deleteMany({});

    console.log("  → Пользователи...");
    await tx.user.deleteMany({});

    console.log("  → Товары...");
    await tx.product.deleteMany({});

    console.log("  → Бренды...");
    await tx.brand.deleteMany({});

    console.log("  → Значения атрибутов...");
    await tx.attributeValue.deleteMany({});

    console.log("  → Группы атрибутов...");
    await tx.attributeGroup.deleteMany({});

    console.log("  → Категории...");
    await tx.category.deleteMany({});

    console.log("  → Новости...");
    await tx.newsPost.deleteMany({});
  });

  if (process.env.DATABASE_URL?.startsWith("file:")) {
    console.log("  → Сброс счётчиков sqlite_sequence...");
    await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence");
  }
  console.log("  ✅ Всё удалено.\n");

  console.log("👤 Создаю двух администраторов...\n");

  for (let i = 0; i < ADMINS.length; i++) {
    const { login, password } = ADMINS[i];
    const loginNorm = login.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const referralCode = `SAY${1001 + i}`;

    await prisma.user.create({
      data: {
        login: loginNorm,
        name: loginNorm === "albina" ? "Albina" : null,
        phone: null,
        address: null,
        email: null,
        referralCode,
        passwordHash,
        role: "ADMIN",
        bonusBalance: 0,
        slotsTotal: 1,
        slotsUsed: 0,
      },
    });

    console.log(`  ✅ ${loginNorm}`);
    console.log(`     Пароль: ${"*".repeat(password.length)}`);
    console.log(`     Реферальный код: ${referralCode}`);
  }

  console.log("\n✅ Готово к выкладке.");
  console.log("\n📝 Вход в админку: /admin/login");
  console.log("   1) Логин: 131say   Пароль: Sayana313#");
  console.log("   2) Логин: albina   Пароль: Saya313#");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
