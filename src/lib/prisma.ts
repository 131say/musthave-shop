// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Адаптер для SQLite (Prisma 7 требует adapter или accelerateUrl)
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not set. Create .env and set DATABASE_URL (e.g. file:./prisma/dev.db)");
}

const adapter = new PrismaBetterSqlite3({
  url: dbUrl,
});

// Глобальный singleton, чтобы не создавать клиента при каждом hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
