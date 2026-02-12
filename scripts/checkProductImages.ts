import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      slug: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const total = products.length;
  const withImages = products.filter((p) => p.imageUrl).length;
  const withoutImages = total - withImages;

  console.log("\n📊 Статистика по изображениям товаров:\n");
  console.log(`Всего товаров: ${total}`);
  console.log(`С изображениями: ${withImages} (${Math.round((withImages / total) * 100)}%)`);
  console.log(`Без изображений: ${withoutImages} (${Math.round((withoutImages / total) * 100)}%)\n`);

  if (withoutImages > 0) {
    console.log("❌ Товары без изображений:\n");
    products
      .filter((p) => !p.imageUrl)
      .slice(0, 10)
      .forEach((p) => {
        console.log(`  - [ID: ${p.id}] ${p.name}`);
      });
    if (withoutImages > 10) {
      console.log(`  ... и ещё ${withoutImages - 10} товаров\n`);
    }
  }

  if (withImages > 0) {
    console.log("✅ Примеры товаров с изображениями:\n");
    products
      .filter((p) => p.imageUrl)
      .slice(0, 5)
      .forEach((p) => {
        console.log(`  - [ID: ${p.id}] ${p.name}`);
        console.log(`    URL: ${p.imageUrl}\n`);
      });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
