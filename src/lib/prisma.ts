// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prismaInstance?: PrismaClient;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prismaInstance) {
    return globalForPrisma.prismaInstance;
  }
  // Fallback только чтобы билд Next (Collecting page data) не падал без DATABASE_URL.
  // На сервере обязательно задать DATABASE_URL в env.
  const dbUrl =
    process.env.DATABASE_URL || "file:./prisma/dev.db";
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    console.warn(
      "[prisma] DATABASE_URL is not set; using fallback. Set DATABASE_URL in production."
    );
  }
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV !== "production" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaInstance = client;
  }
  return client;
}

// Ленивый доступ: клиент создаётся при первом обращении (не при импорте).
// Это позволяет билду Next проходить без DATABASE_URL; ошибка будет при первом запросе к API.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrismaClient() as Record<string | symbol, unknown>)[prop];
  },
});
