// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const slugifyAttr = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9а-яё\-]/gi, "");

function inferBrandName(productName: string): string | null {
  const n = productName.trim();
  if (!n) return null;
  if (n.toLowerCase().startsWith('some by mi')) return 'Some By Mi';
  const first = n.split(/\s+/)[0];
  if (first && first.length <= 24) return first;
  return null;
}

async function main() {
  // categories (MVP)
  const cats = ["Очищение", "Тоники", "Кремы", "Сыворотки", "Маски", "SPF"];
  for (const name of cats) {
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  // Базовые продукты косметики
  const products = [
    {
      name: 'COSRX Low pH Good Morning Gel Cleanser',
      slug: 'cosrx-low-ph-good-morning-gel-cleanser',
      description:
        'Мягкий гель для умывания с низким pH для ежедневного очищения без чувства стянутости.',
      price: 5500,
      costPrice: 3300,
      oldPrice: 6500,
      imageUrl: '/images/products/cosrx-cleanser.jpg',
    },
    {
      name: 'Some By Mi AHA BHA PHA 30 Days Miracle Toner',
      slug: 'some-by-mi-aha-bha-pha-miracle-toner',
      description:
        'Тонер с кислотами AHA/BHA/PHA для очищения пор, выравнивания рельефа и улучшения тона кожи.',
      price: 7200,
      costPrice: 4300,
      oldPrice: 8500,
      imageUrl: '/images/products/somebymi-toner.jpg',
    },
    {
      name: 'Laneige Water Sleeping Mask',
      slug: 'laneige-water-sleeping-mask',
      description:
        'Ночная увлажняющая маска, которая восстанавливает кожу во время сна и делает её более упругой и сияющей.',
      price: 9800,
      costPrice: 5900,
      oldPrice: null,
      imageUrl: '/images/products/laneige-mask.jpg',
    },
    {
      name: 'Innisfree Green Tea Seed Serum',
      slug: 'innisfree-green-tea-seed-serum',
      description:
        'Сыворотка с зелёным чаем для глубокого увлажнения и защиты кожи от окружающей среды.',
      price: 8900,
      costPrice: 5300,
      oldPrice: 9500,
      imageUrl: '/images/products/innisfree-serum.jpg',
    },
    {
      name: 'Etude House SoonJung 2x Barrier Intensive Cream',
      slug: 'etude-house-soonjung-intensive-cream',
      description:
        'Крем для чувствительной кожи с пантенолом и мадекассосидом, укрепляет защитный барьер.',
      price: 7600,
      costPrice: 4600,
      oldPrice: null,
      imageUrl: '/images/products/etude-cream.jpg',
    },
  ];

  for (const product of products) {
    const brandName = inferBrandName(product.name);
    const brand = brandName
      ? {
          connectOrCreate: {
            where: { name: brandName },
            create: { name: brandName, slug: slugify(brandName) || 'brand' },
          },
        }
      : undefined;

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        ...product,
        ...(brand ? { brand } : {}),
      },
      create: {
        ...product,
        ...(brand ? { brand } : {}),
        isActive: true,
      },
    });
  }

  // --- Attribute Groups + Values (универсальные фильтры) ---
  // 1) Тип кожи
  const skinGroup = await prisma.attributeGroup.upsert({
    where: { slug: "skin-type" },
    update: { name: "Тип кожи", sort: 10 },
    create: { name: "Тип кожи", slug: "skin-type", sort: 10 },
  });

  const skinValues = ["Сухая", "Жирная", "Комбинированная", "Нормальная", "Чувствительная"];
  for (let i = 0; i < skinValues.length; i++) {
    const name = skinValues[i]!;
    await prisma.attributeValue.upsert({
      where: { groupId_slug: { groupId: skinGroup.id, slug: slugifyAttr(name) } },
      update: { name, sort: i * 10 },
      create: { groupId: skinGroup.id, name, slug: slugifyAttr(name), sort: i * 10 },
    });
  }

  // 2) Назначение / проблема
  const goalGroup = await prisma.attributeGroup.upsert({
    where: { slug: "goals" },
    update: { name: "Назначение", sort: 20 },
    create: { name: "Назначение", slug: "goals", sort: 20 },
  });

  const goalValues = [
    "Увлажнение",
    "Акне/высыпания",
    "Пигментация/пятна",
    "Антивозраст",
    "Барьер/восстановление",
    "Покраснение/успокоение",
    "Очищение пор",
    "SPF/защита",
  ];
  for (let i = 0; i < goalValues.length; i++) {
    const name = goalValues[i]!;
    await prisma.attributeValue.upsert({
      where: { groupId_slug: { groupId: goalGroup.id, slug: slugifyAttr(name) } },
      update: { name, sort: i * 10 },
      create: { groupId: goalGroup.id, name, slug: slugifyAttr(name), sort: i * 10 },
    });
  }

  // 3) Активы (ключевые ингредиенты)
  const activesGroup = await prisma.attributeGroup.upsert({
    where: { slug: "actives" },
    update: { name: "Активы", sort: 30 },
    create: { name: "Активы", slug: "actives", sort: 30 },
  });

  const activeValues = [
    "Ниацинамид",
    "Ретинол",
    "Витамин C",
    "AHA",
    "BHA",
    "PHA",
    "Церамиды",
    "Гиалуроновая кислота",
    "Пептиды",
    "Салициловая кислота",
  ];
  for (let i = 0; i < activeValues.length; i++) {
    const name = activeValues[i]!;
    await prisma.attributeValue.upsert({
      where: { groupId_slug: { groupId: activesGroup.id, slug: slugifyAttr(name) } },
      update: { name, sort: i * 10 },
      create: { groupId: activesGroup.id, name, slug: slugifyAttr(name), sort: i * 10 },
    });
  }

  console.log('✅ Seed completed: products created/updated');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

