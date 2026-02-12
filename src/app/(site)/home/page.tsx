// src/app/(site)/home/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { ProductGrid } from '@/components/ProductGrid';
import NewsBlock from '@/components/NewsBlock';

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        price: true,
        oldPrice: true,
        imageUrl: true,
      },
    }),
    getSettings(),
  ]);

  // Парсим теги из JSON
  let tags: string[] = [];
  try {
    if (settings.promoTags) {
      tags = JSON.parse(settings.promoTags);
    }
  } catch (e) {
    // Если не удалось распарсить, используем дефолтные
    tags = ["+ бонусы за каждый заказ", "доставка по Казахстану", "оригинальная продукция"];
  }

  // Дефолтные значения, если не заданы в настройках
  const promoTitle = settings.promoTitle || "Косметика и уход, которые хочется повторять";
  const promoDescription = settings.promoDescription || "Подборка проверенной косметики и средств ухода с доставкой по всему Казахстану. Копи бонусы, делись реферальным кодом и экономь на каждом заказе.";
  const defaultTags = ["+ бонусы за каждый заказ", "доставка по Казахстану", "оригинальная продукция"];
  const displayTags = tags.length > 0 ? tags : defaultTags;
  
  // Разделяем заголовок на части (до и после запятой, если есть)
  const titleParts = promoTitle.split(',');
  const titleMain = titleParts[0] || promoTitle;
  const titleHighlight = titleParts.slice(1).join(',').trim();

  return (
    <div className="space-y-8 dark:text-white">
      <NewsBlock />
      <section className="grid gap-6 rounded-3xl bg-gradient-to-r from-amber-50/30 to-neutral-50 border border-amber-100 p-6 dark:from-neutral-900 dark:to-neutral-800 dark:border-neutral-800 sm:grid-cols-[2fr,1.2fr]">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold leading-tight dark:text-white">
            {titleMain}
            {titleHighlight && (
              <>
                ,{' '}
                <span className="text-amber-600 dark:text-amber-400">{titleHighlight}</span>
              </>
            )}
          </h2>
          <p className="text-sm text-slate-600 dark:text-gray-300">
            {promoDescription}
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            {displayTags.map((tag, idx) => (
              <span key={idx} className="rounded-full bg-white/80 px-3 py-1 dark:bg-neutral-800/80 dark:text-gray-200">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center">
          {settings.promoImageUrl ? (
            <div className="relative h-32 w-32 sm:h-40 sm:w-40">
              <img
                src={settings.promoImageUrl}
                alt="Промо-баннер"
                className="h-full w-full rounded-3xl object-cover shadow-lg shadow-amber-100 dark:shadow-neutral-900"
              />
            </div>
          ) : (
            <div className="relative h-32 w-32 sm:h-40 sm:w-40">
              <div className="absolute inset-0 rounded-3xl bg-white/70 shadow-lg shadow-amber-100 dark:bg-neutral-800/70 dark:shadow-neutral-900" />
              <div className="absolute inset-3 rounded-2xl border border-dashed border-amber-200 dark:border-neutral-700" />
              <div className="absolute inset-6 flex items-center justify-center text-center text-[11px] text-slate-500 dark:text-gray-400">
                Здесь позже будет красивая промо-картинка
                <br />
                или баннер
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold dark:text-white">Популярные средства</h3>
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Нажми «В корзину», чтобы добавить товар
          </span>
        </div>

        <ProductGrid products={products} />
      </section>
    </div>
  );
}






