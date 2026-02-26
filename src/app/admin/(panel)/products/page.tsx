// src/app/admin/products/page.tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductsToolbar from './ProductsToolbar';
import ProductToggle from './ProductToggle';
import ProductImage from './ProductImage';
import { getThumbImage } from '@/lib/imageUtils';

export const dynamic = 'force-dynamic';

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>
  | undefined;

async function unwrapSearchParams(sp: SearchParams) {
  const v: any = sp;
  if (v && typeof v?.then === "function") return (await v) ?? {};
  return v ?? {};
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  try {
    const sp = await unwrapSearchParams(searchParams);
    const q = Array.isArray(sp.q) ? sp.q[0] : (sp.q || '').toString().trim();
    const statusRaw = Array.isArray(sp.status) ? sp.status[0] : (sp.status || 'ALL');
    const status = statusRaw.toString().trim();

    // Получаем данные для фильтров
    const [categories, brands, attrGroups] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.brand.findMany({ orderBy: { name: 'asc' } }),
      prisma.attributeGroup.findMany({
        include: { values: { orderBy: { name: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    const categoryIds = Array.isArray(sp.categoryIds) 
      ? sp.categoryIds.map(id => Number(id)).filter(Number.isFinite)
      : sp.categoryIds ? [Number(sp.categoryIds)].filter(Number.isFinite) : [];
    const brandIds = Array.isArray(sp.brandIds)
      ? sp.brandIds.map(id => Number(id)).filter(Number.isFinite)
      : sp.brandIds ? [Number(sp.brandIds)].filter(Number.isFinite) : [];
    const attrValueIds = Array.isArray(sp.attrValueIds)
      ? sp.attrValueIds.map(id => Number(id)).filter(Number.isFinite)
      : sp.attrValueIds ? [Number(sp.attrValueIds)].filter(Number.isFinite) : [];
    const priceFrom = sp.priceFrom ? Number(sp.priceFrom) : null;
    const priceTo = sp.priceTo ? Number(sp.priceTo) : null;

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { brand: { is: { name: { contains: q } } } },
      ];
    }

    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE') where.isActive = false;

    if (categoryIds.length > 0) {
      where.categories = {
        some: {
          categoryId: { in: categoryIds },
        },
      };
    }

    if (brandIds.length > 0) {
      where.brandId = { in: brandIds };
    }

    if (attrValueIds.length > 0) {
      where.attributes = {
        some: {
          valueId: { in: attrValueIds },
        },
      };
    }

    if (priceFrom != null || priceTo != null) {
      where.price = {};
      if (priceFrom != null) where.price.gte = priceFrom;
      if (priceTo != null) where.price.lte = priceTo;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
        attributes: { include: { value: { include: { group: true } } } },
      },
    });

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Товары</h1>
      </div>

      <ProductsToolbar 
        initialQ={q} 
        initialStatus={status}
        initialCategoryIds={categoryIds}
        initialBrandIds={brandIds}
        initialAttrValueIds={attrValueIds}
        initialPriceFrom={priceFrom}
        initialPriceTo={priceTo}
        categories={categories}
        brands={brands}
        attrGroups={attrGroups}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {/* Заголовок таблицы — только на md и выше */}
        <div className="hidden md:grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300">
          <div className="col-span-4">Товар</div>
          <div className="col-span-1">Бренд</div>
          <div className="col-span-2">Категории</div>
          <div className="col-span-1 text-right">Цена</div>
          <div className="col-span-1 text-right">Старая</div>
          <div className="col-span-2 text-right">Действия</div>
        </div>

        {products.map((p) => (
          <div key={p.id} className="border-b border-slate-100 last:border-b-0 dark:border-neutral-700">
            {/* Мобильная карточка */}
            <div
              className="md:hidden px-4 py-4"
            >
              <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800">
                  <ProductImage
                    imageUrl={getThumbImage(p.imageUrl)}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-gray-400">#{p.id}</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-gray-300">
                    <div><span className="text-slate-500 dark:text-gray-400">Бренд:</span> {p.brand?.name || '—'}</div>
                    <div><span className="text-slate-500 dark:text-gray-400">Категории:</span> {Array.isArray(p.categories) && p.categories.length ? p.categories.map((x: any) => x.category?.name).filter(Boolean).slice(0, 3).join(', ') : '—'}</div>
                    <div><span className="text-slate-500 dark:text-gray-400">Цена:</span> <span className="font-semibold dark:text-white">{p.price.toLocaleString('ru-RU')} ₸</span></div>
                    {p.oldPrice != null && (
                      <div><span className="text-slate-500 dark:text-gray-400">Старая:</span> <span className="line-through">{p.oldPrice.toLocaleString('ru-RU')} ₸</span></div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
                    >
                      Редактировать
                    </Link>
                    <ProductToggle productId={p.id} initialActive={p.isActive} />
                  </div>
                </div>
              </div>
            </div>

            {/* Десктопная строка таблицы */}
            <div
              className="hidden md:grid grid-cols-12 items-center gap-2 px-4 py-3"
            >
            <div className="col-span-4 min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center dark:border-neutral-700 dark:bg-neutral-800">
                  <ProductImage 
                    imageUrl={getThumbImage(p.imageUrl)} 
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium dark:text-white">{p.name}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-gray-400">#{p.id}</div>
                </div>
              </div>
            </div>

            <div className="col-span-1 truncate text-xs text-slate-600 dark:text-gray-300">
              {p.brand?.name || '—'}
            </div>

            <div className="col-span-2 text-xs text-slate-600 dark:text-gray-300">
              {Array.isArray(p.categories) && p.categories.length
                ? p.categories
                    .map((x: any) => x.category?.name)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ")
                : "—"}
            </div>

            <div className="col-span-1 text-right text-sm font-semibold dark:text-white">
              {p.price.toLocaleString('ru-RU')} ₸
            </div>

            <div className="col-span-1 text-right text-sm text-slate-500 dark:text-gray-400">
              {p.oldPrice ? (
                <span className="line-through">
                  {p.oldPrice.toLocaleString('ru-RU')} ₸
                </span>
              ) : (
                '—'
              )}
            </div>

            <div className="col-span-2 flex items-center justify-end gap-3">
              <Link
                href={`/admin/products/${p.id}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
              >
                Редактировать
              </Link>
              <ProductToggle productId={p.id} initialActive={p.isActive} />
            </div>
            </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="p-6 text-sm text-slate-600 dark:text-gray-400">Ничего не найдено.</div>
        )}
      </div>
    </div>
  );
  } catch (error: any) {
    console.error('AdminProductsPage error:', error);
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Товары</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/30">
          <p className="text-red-700 dark:text-red-300">
            Ошибка загрузки: {error?.message || 'Неизвестная ошибка'}
          </p>
        </div>
      </div>
    );
  }
}


