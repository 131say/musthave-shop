import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as fs from "fs/promises";
import * as path from "path";
import sharp from "sharp";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

// Варианты изображений (как в upload route)
const VARIANTS = {
  thumb: { w: 200, h: 200, fit: "cover" as const, quality: 85 },
  card: { w: 400, h: 400, fit: "cover" as const, quality: 85 },
  large: { w: 800, h: 800, fit: "cover" as const, quality: 90 },
};

function safeExtFromMime(mime: string, keepPng: boolean): string {
  if (keepPng) return "png";
  if (mime.includes("png")) return "jpg"; // convert PNG to JPG if no alpha
  if (mime.includes("webp")) return "jpg";
  return "jpg";
}

async function processImage(
  sourcePath: string,
  targetDir: string,
  baseName: string
): Promise<{ url: string; variants: { thumb: string; card: string; large: string } }> {
  const buffer = await fs.readFile(sourcePath);
  
  // Определяем MIME тип
  const ext = path.extname(sourcePath).toLowerCase();
  let mime = "image/jpeg";
  if (ext === ".png") mime = "image/png";
  if (ext === ".webp") mime = "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";

  // Проверяем метаданные
  let meta;
  try {
    meta = await sharp(buffer, { failOn: "none" }).metadata();
  } catch (e) {
    throw new Error(`Не удалось прочитать метаданные изображения: ${sourcePath}`);
  }

  if (!meta || !meta.format) {
    throw new Error(`Не удалось определить формат изображения: ${sourcePath}`);
  }

  const hasAlpha = !!meta.hasAlpha;
  const keepPng = mime === "image/png" && hasAlpha;
  const outputExt = safeExtFromMime(mime, keepPng);

  const outputs: Record<string, { url: string; size: number }> = {};

  const makePipeline = (variant: keyof typeof VARIANTS) => {
    const v = VARIANTS[variant];
    const s = sharp(buffer, { failOn: "none" })
      .rotate() // respect EXIF
      .resize({
        width: v.w,
        height: v.h,
        fit: v.fit,
        withoutEnlargement: true,
      });

    if (keepPng) {
      return s.png({ compressionLevel: 9, adaptiveFiltering: true });
    }

    return s.jpeg({
      quality: v.quality,
      progressive: true,
      mozjpeg: true,
    });
  };

  // Создаем все варианты
  for (const variant of Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]) {
    const outName = `${baseName}-${variant}.${outputExt}`;
    const outPath = path.join(targetDir, outName);
    const outBuf = await makePipeline(variant).toBuffer();
    await fs.writeFile(outPath, outBuf);
    outputs[variant] = {
      url: `/images/products/${outName}`,
      size: outBuf.length,
    };
  }

  return {
    url: outputs.large.url,
    variants: {
      thumb: outputs.thumb.url,
      card: outputs.card.url,
      large: outputs.large.url,
    },
  };
}

async function main() {
  // Путь к папке с фотографиями
  const photosDir = path.join(process.cwd(), "..", "фотки для товара");
  const targetDir = path.join(process.cwd(), "public", "images", "products");

  // Проверяем существование папки с фотографиями
  try {
    await fs.access(photosDir);
  } catch (e) {
    console.error(`❌ Папка не найдена: ${photosDir}`);
    process.exit(1);
  }

  // Создаем целевую папку, если её нет
  await fs.mkdir(targetDir, { recursive: true });

  // Получаем все изображения из папки
  const files = await fs.readdir(photosDir);
  const imageFiles = files.filter(
    (f) =>
      f.toLowerCase().endsWith(".jpg") ||
      f.toLowerCase().endsWith(".jpeg") ||
      f.toLowerCase().endsWith(".png") ||
      f.toLowerCase().endsWith(".webp")
  );

  console.log(`\n📸 Найдено изображений: ${imageFiles.length}\n`);

  if (imageFiles.length === 0) {
    console.log("❌ В папке нет изображений!\n");
    return;
  }

  // Получаем все товары
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
  });

  console.log(`📦 Найдено товаров: ${products.length}\n`);

  if (products.length === 0) {
    console.log("❌ В базе нет товаров!\n");
    return;
  }

  // Обрабатываем изображения и присваиваем их товарам
  let processed = 0;
  const maxProducts = Math.min(products.length, imageFiles.length);

  for (let i = 0; i < maxProducts; i++) {
    const imageFile = imageFiles[i];
    const product = products[i];

    const sourcePath = path.join(photosDir, imageFile);
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      console.log(`📷 Обрабатываю: ${imageFile} → [ID: ${product.id}] ${product.name}`);

      const result = await processImage(sourcePath, targetDir, baseName);

      // Обновляем товар в базе данных
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: result.url },
      });

      processed++;
      console.log(`   ✅ URL: ${result.url}\n`);
    } catch (e: any) {
      console.error(`   ❌ Ошибка при обработке ${imageFile}: ${e.message}\n`);
    }
  }

  console.log(`\n🎉 Обработано товаров: ${processed} из ${maxProducts}\n`);

  if (processed < products.length) {
    console.log(`⚠️  Осталось товаров без изображений: ${products.length - processed}\n`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Критическая ошибка:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
