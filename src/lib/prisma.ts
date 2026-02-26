// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prismaInstance?: PrismaClient;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prismaInstance) {
    return globalForPrisma.prismaInstance;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[prisma] DATABASE_URL is not set. Set DATABASE_URL in production.");
    }
    throw new Error("DATABASE_URL is required");
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl,
    ssl: dbUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV !== "production" ? ["warn", "error"] : ["error"],
  });

  // Singleton и в production, чтобы не исчерпывать connection_limit пулера Neon
  globalForPrisma.prismaInstance = client;
  return client;
}

// Ленивый доступ: клиент создаётся при первом обращении (не при импорте).
// Это позволяет билду Next проходить без DATABASE_URL; ошибка будет при первом запросе к API.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrismaClient() as Record<string | symbol, unknown>)[prop];
  },
});
