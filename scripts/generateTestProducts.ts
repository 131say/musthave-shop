import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickMany<T>(arr: T[], min: number, max: number) {
  const n = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function money(n: number) {
  return Math.max(500, Math.round(n / 10) * 10);
}

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

const BRANDS = [
  "COSRX",
  "Some By Mi",
  "Round Lab",
  "Beauty of Joseon",
  "Laneige",
  "Innisfree",
  "Etude",
  "Missha",
  "Mediheal",
  "Pyunkang Yul",
];

const PRODUCT_BASE = [
  { kind: "Очищение", names: ["Пенка", "Гель", "Бальзам", "Мицеллярная вода"], price: [3500, 9500], cost: [1800, 6000] },
  { kind: "Тоники", names: ["Тонер", "Тонер-пэды", "Эссенция-тоник"], price: [4500, 12000], cost: [2200, 7500] },
  { kind: "Сыворотки", names: ["Сыворотка", "Ампула", "Серум"], price: [6500, 18000], cost: [3500, 12000] },
  { kind: "Кремы", names: ["Крем", "Гель-крем", "Крем для век"], price: [5500, 16000], cost: [3000, 11000] },
  { kind: "Маски", names: ["Тканевая маска", "Ночная маска", "Глиняная маска"], price: [1500, 9000], cost: [700, 5500] },
  { kind: "SPF", names: ["Солнцезащитный крем SPF50+", "Стик SPF50+", "Флюид SPF50+"], price: [6000, 17000], cost: [3300, 12000] },
];

const SKIN = ["Сухая", "Жирная", "Комбинированная", "Нормальная", "Чувствительная"];
const GOALS = [
  "Увлажнение",
  "Акне/высыпания",
  "Пигментация/пятна",
  "Антивозраст",
  "Барьер/восстановление",
  "Покраснение/успокоение",
  "Сияние/тон",
  "Очищение пор",
];
const ACTIVES = [
  "Ниацинамид",
  "Ретинол",
  "Витамин C",
  "AHA",
  "BHA",
  "PHA",
  "Церамиды",
  "Гиалуроновая кислота",
  "Пептиды",
  "Центелла",
];

function buildDescription(opts: {
  brand: string;
  kind: string;
  name: string;
  skin: string[];
  goals: string[];
  actives: string[];
  volumeMl: number;
  howTo: string;
}) {
  const { brand, kind, name, skin, goals, actives, volumeMl, howTo } = opts;

  const bullets = [
    `Подходит для: ${skin.join(", ")}.`,
    `Назначение: ${goals.join(", ")}.`,
    actives.length ? `Активы: ${actives.join(", ")}.` : `Активы: без ярко выраженных активов (мягкая формула).`,
    `Объём: ${volumeMl} мл.`,
  ];

  const cautions = [
    `При чувствительной коже сделайте патч-тест.`,
    `При использовании кислот/ретинола днём обязательно SPF.`,
  ];

  return [
    `${brand} • ${name} (${kind})`,
    ``,
    `Коротко: средство для ежедневного ухода с фокусом на ${goals[0].toLowerCase()} и комфорте кожи.`,
    ``,
    `Кому подойдёт`,
    `- ${bullets.join("\n- ")}`,
    ``,
    `Как использовать`,
    `- ${howTo}`,
    ``,
    `Советы`,
    `- ${cautions.join("\n- ")}`,
  ].join("\n");
}

async function ensureBrand(name: string) {
  const slug = slugify(name);
  return prisma.brand.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((x) => x.startsWith("--count="));
  const count = countArg ? Number(countArg.split("=")[1]) : 120;

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  const groups = await prisma.attributeGroup.findMany({
    include: { values: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  let groupSkin = groups.find((g) => g.slug === "skin-type");
  let groupGoals = groups.find((g) => g.slug === "goals");
  let groupActives = groups.find((g) => g.slug === "actives");

  // Создаём группы атрибутов, если их нет
  if (!groupSkin) {
    groupSkin = await prisma.attributeGroup.create({
      data: { name: "Тип кожи", slug: "skin-type", sort: 10 },
    });
  }
  if (!groupGoals) {
    groupGoals = await prisma.attributeGroup.create({
      data: { name: "Назначение", slug: "goals", sort: 20 },
    });
  }
  if (!groupActives) {
    groupActives = await prisma.attributeGroup.create({
      data: { name: "Активы", slug: "actives", sort: 30 },
    });
  }

  // Создаём значения атрибутов, если их нет
  const skinValuesToCreate = ["Сухая", "Жирная", "Комбинированная", "Нормальная", "Чувствительная"];
  for (const name of skinValuesToCreate) {
    const slug = slugify(name);
    await prisma.attributeValue.upsert({
      where: { groupId_slug: { groupId: groupSkin.id, slug } },
      update: { name },
      create: { groupId: groupSkin.id, name, slug, sort: 0 },
    });
  }

  const goalValuesToCreate = [
    "Увлажнение",
    "Акне/высыпания",
    "Пигментация/пятна",
    "Антивозраст",
    "Барьер/восстановление",
    "Покраснение/успокоение",
    "Очищение пор",
    "SPF/защита",
  ];
  for (const name of goalValuesToCreate) {
    const slug = slugify(name);
    await prisma.attributeValue.upsert({
      where: { groupId_slug: { groupId: groupGoals.id, slug } },
      update: { name },
      create: { groupId: groupGoals.id, name, slug, sort: 0 },
    });
  }

  const activeValuesToCreate = [
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
  for (const name of activeValuesToCreate) {
    const slug = slugify(name);
    await prisma.attributeValue.upsert({
      where: { groupId_slug: { groupId: groupActives.id, slug } },
      update: { name },
      create: { groupId: groupActives.id, name, slug, sort: 0 },
    });
  }

  // Перезагружаем группы с значениями
  const updatedGroups = await prisma.attributeGroup.findMany({
    where: { id: { in: [groupSkin.id, groupGoals.id, groupActives.id] } },
    include: { values: { orderBy: { name: "asc" } } },
  });
  
  groupSkin = updatedGroups.find((g) => g.id === groupSkin!.id)!;
  groupGoals = updatedGroups.find((g) => g.id === groupGoals!.id)!;
  groupActives = updatedGroups.find((g) => g.id === groupActives!.id)!;

  const skinVals = groupSkin.values;
  const goalVals = groupGoals.values;
  const activeVals = groupActives.values;

  // create brands upfront
  const brandRows = await Promise.all(BRANDS.map(ensureBrand));

  const created: number[] = [];

  for (let i = 0; i < count; i++) {
    const base = pick(PRODUCT_BASE);
    const brand = pick(brandRows);
    const typeName = pick(base.names);

    const skin = pickMany(SKIN, 1, 2);
    const goals = pickMany(GOALS, 1, 2);
    const actives = Math.random() < 0.75 ? pickMany(ACTIVES, 0, 3) : [];

    const volumeMl = pick([30, 50, 80, 120, 150, 200]);
    const suffix = pick([
      "Light",
      "Daily",
      "Calm",
      "Repair",
      "Glow",
      "Barrier",
      "Clear",
      "Hydra",
      "Tone",
      "Balance",
    ]);

    const name = `${typeName} ${suffix} ${volumeMl}ml`;
    const slugBase = slugify(`${brand.slug}-${name}-${i + 1}`);
    const price = money(base.price[0] + Math.random() * (base.price[1] - base.price[0]));
    const costPrice = money(base.cost[0] + Math.random() * (base.cost[1] - base.cost[0]));
    const hasSale = Math.random() < 0.35;
    const oldPrice = hasSale ? money(price * (1 + (Math.random() * 0.35 + 0.1))) : null;

    const howTo = (() => {
      if (base.kind === "Очищение") return "Нанесите на влажную кожу, вспеньте 30–60 секунд, смойте тёплой водой.";
      if (base.kind === "Тоники") return "Нанесите на ладони или ватный диск, распределите по лицу, затем переходите к сыворотке.";
      if (base.kind === "Сыворотки") return "2–3 капли после тоника, затем крем. Начните с 3–4 раз в неделю при активных ингредиентах.";
      if (base.kind === "Кремы") return "Нанесите финальным этапом ухода утром/вечером, распределите по лицу и шее.";
      if (base.kind === "Маски") return "Используйте 1–3 раза в неделю после очищения и тоника, затем крем.";
      return "Нанесите последним шагом утром, обновляйте каждые 2–3 часа при активном солнце.";
    })();

    const description = buildDescription({
      brand: brand.name,
      kind: base.kind,
      name,
      skin,
      goals,
      actives,
      volumeMl,
      howTo,
    });

    const category = catByName.get(base.kind.toLowerCase());
    const categoryConnect = category ? [{ categoryId: category.id }] : [];

    // map chosen labels -> attributeValue ids
    const chosenValueIds: number[] = [];
    for (const s of skin) {
      const v = skinVals.find((x) => x.name.toLowerCase() === s.toLowerCase());
      if (v) chosenValueIds.push(v.id);
    }
    for (const g of goals) {
      const v = goalVals.find((x) => x.name.toLowerCase() === g.toLowerCase());
      if (v) chosenValueIds.push(v.id);
    }
    for (const a of actives) {
      const v = activeVals.find((x) => x.name.toLowerCase() === a.toLowerCase());
      if (v) chosenValueIds.push(v.id);
    }

    // Генерируем случайное изображение для товара
    const imageUrl = generateRandomImageUrl(i + Date.now(), base.kind);

    const p = await prisma.product.create({
      data: {
        name: `${brand.name} ${name}`,
        slug: slugBase,
        description,
        price,
        costPrice,
        oldPrice,
        imageUrl,
        isActive: true,
        brandId: brand.id,
        categories: categoryConnect.length
          ? {
              createMany: { data: categoryConnect },
            }
          : undefined,
        attributes: chosenValueIds.length
          ? {
              createMany: {
                data: Array.from(new Set(chosenValueIds)).map((valueId) => ({
                  valueId,
                })),
              },
            }
          : undefined,
      },
    });

    created.push(p.id);
  }

  console.log(JSON.stringify({ ok: true, created: created.length }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

