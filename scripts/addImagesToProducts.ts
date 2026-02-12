import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

// Генерирует случайный URL изображения для товара
function generateRandomImageUrl(seed: number, productKind?: string): string {
  // Используем Unsplash Source API с тематикой косметики/красоты
  // seed гарантирует уникальность изображения для каждого товара
  
  // Выбираем тему в зависимости от типа товара
  let theme = 'cosmetics';
  if (productKind) {
    const kindLower = productKind.toLowerCase();
    if (kindLower.includes('очищение') || kindLower.includes('гель') || kindLower.includes('пенка')) {
      theme = 'skincare';
    } else if (kindLower.includes('тоник') || kindLower.includes('эссенция')) {
      theme = 'beauty';
    } else if (kindLower.includes('сыворотка') || kindLower.includes('серум') || kindLower.includes('ампула')) {
      theme = 'serum';
    } else if (kindLower.includes('крем')) {
      theme = 'cream';
    } else if (kindLower.includes('маска')) {
      theme = 'facemask';
    } else if (kindLower.includes('spf') || kindLower.includes('солнцезащит')) {
      theme = 'sunscreen';
    }
  }
  
  // Размеры: 600x600 для хорошего качества
  // Используем seed для уникальности каждого изображения
  return `https://source.unsplash.com/random/600x600/?${theme}&sig=${seed}`;
}

async function main() {
  // Получаем все товары без изображений
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { imageUrl: "" },
      ],
    },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  console.log(`\n📦 Найдено товаров без изображений: ${products.length}\n`);

  if (products.length === 0) {
    console.log("✅ Все товары уже имеют изображения!\n");
    return;
  }

  let updated = 0;

  for (const product of products) {
    // Определяем тип товара из категорий или названия
    let productKind: string | undefined;
    
    // Пытаемся определить тип из категорий
    const categoryNames = product.categories
      .map((pc) => pc.category?.name)
      .filter(Boolean)
      .join(" ");
    
    if (categoryNames) {
      productKind = categoryNames;
    } else {
      // Если категорий нет, пытаемся определить из названия
      productKind = product.name;
    }

    // Генерируем изображение
    const imageUrl = generateRandomImageUrl(product.id + Date.now(), productKind);

    // Обновляем товар
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl },
    });

    updated++;
    console.log(`✅ [ID: ${product.id}] ${product.name}`);
    console.log(`   URL: ${imageUrl}\n`);
  }

  console.log(`\n🎉 Обновлено товаров: ${updated}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
