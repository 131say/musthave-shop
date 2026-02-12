'use client';

import Link from "next/link";
import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CatalogFilters from './CatalogFilters';
import { addToCart } from '@/lib/cart';
import ReferralBanner from '@/components/ReferralBanner';

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  isRecommended?: boolean;
  brand?: { id: number; name: string; slug: string } | null;
  categories?: { category: { id: number; name: string; slug: string } }[];
  attributes?: { value: { id: number; name: string; slug: string; group: { slug: string } } }[];
};

type BrandItem = { id: number; name: string; slug: string; count: number };
type CategoryItem = { id: number; name: string; slug: string; count: number };
type AttrValue = { id: number; name: string; slug: string; count: number };
type AttrGroup = { id: number; name: string; slug: string; values: AttrValue[] };

type Props = {
  products: Product[];
  brands: BrandItem[];
  categories: CategoryItem[];
  attrGroups: AttrGroup[];
  initialSearch: Record<string, string | undefined>;
};

import { getCardImage } from '@/lib/imageUtils';

function ProductCard({ p }: { p: Product }) {
  const href = `/product/${encodeURIComponent(String(p.slug))}-${p.id}`;
  const imgSrc = getCardImage(p.imageUrl);
  const brandName = p.brand?.name || "";
  const price = Number(p.price || 0);
  const oldPrice = p.oldPrice ? Number(p.oldPrice) : null;
  const hasImage = Boolean(imgSrc);
  
  // Вычисляем процент скидки
  const discountPercent = oldPrice && oldPrice > price
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : null;

  const handleProductClick = () => {
    try {
      // Сохраняем ID товара и позицию скролла при переходе в карточку
      const scrollPosition = window.scrollY || window.pageYOffset;
      localStorage.setItem("musthave_catalog_scroll", String(scrollPosition));
      localStorage.setItem("musthave_catalog_product_id", String(p.id));
    } catch (e) {
      // Игнорируем ошибки localStorage
    }
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: Number(p.id),
      slug: String(p.slug),
      name: String(p.name),
      brandName: brandName || null,
      price,
      oldPrice,
      imageUrl: p.imageUrl ?? null,
      qty: 1,
    });
  };

  return (
    <Link 
      href={href} 
      className="block rounded-2xl border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 hover:shadow-md transition-shadow"
      onClick={handleProductClick}
      data-product-id={p.id}
    >
      <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden relative dark:bg-neutral-800">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc!}
              alt={p.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            
            {/* Бейджи */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
              {(p as any).isBestseller && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Хит
                </span>
              )}
              {(p as any).isNew && (
                <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Новинка
                </span>
              )}
              {(p as any).isRecommended && (
                <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Рекомендуем
                </span>
              )}
              {discountPercent && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  −{discountPercent}%
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-2">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 sm:h-12 sm:w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 sm:text-xs">Фото появится в ближайшее время</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <div className="text-xs text-gray-500 dark:text-gray-400">{brandName}</div>
        <div className="font-medium leading-snug dark:text-white">{p.name}</div>
        <div className="mt-2 flex items-baseline gap-2 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">
            {price.toLocaleString("ru-RU")} ₸
          </span>
          {oldPrice && (
            <>
              <span className="text-gray-400 dark:text-gray-500 line-through text-xs">
                {oldPrice.toLocaleString("ru-RU")} ₸
              </span>
            </>
          )}
        </div>
      </div>
      
      <button
        className="mt-3 w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 active:scale-95 transition-all duration-150"
        onClick={handleBuyClick}
      >
        Купить
      </button>
    </Link>
  );
}

export default function CatalogClient(props: Props) {
  const {
    products,
    brands,
    categories,
    attrGroups,
    initialSearch,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest' | 'oldest'>('newest');
  // На мобиле фильтры свернуты по умолчанию
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);

  const currentSearch = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const [k, v] of sp.entries()) obj[k] = v;
    // fallback for first render when sp is empty but server passed initialSearch
    return Object.keys(obj).length ? obj : (initialSearch as Record<string, string>);
  }, [sp, initialSearch]);


  // Сохраняем параметры каталога в localStorage для восстановления при возврате
  useEffect(() => {
    try {
      const params: Record<string, string> = {};
      
      // Сохраняем все параметры из currentSearch
      Object.entries(currentSearch).forEach(([key, value]) => {
        if (value && typeof value === "string" && value.trim()) {
          params[key] = value;
        }
      });
      
      // Сохраняем только если есть параметры (не пустой каталог)
      if (Object.keys(params).length > 0) {
        localStorage.setItem("musthave_catalog_params", JSON.stringify(params));
      }
    } catch (e) {
      // Игнорируем ошибки localStorage
    }
  }, [currentSearch]);



  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; value?: string }[] = [];
    const q = (currentSearch.q || '').trim();
    const min = (currentSearch.min || '').trim();
    const max = (currentSearch.max || '').trim();
    const sale = currentSearch.sale;
    const br = (currentSearch.brands || '').split(',').map(s => s.trim()).filter(Boolean);
    const cat = (currentSearch.categories || '').split(',').map(s => s.trim()).filter(Boolean);
    const skin = (currentSearch.skin || '').split(',').map(s => s.trim()).filter(Boolean);
    const goals = (currentSearch.goals || '').split(',').map(s => s.trim()).filter(Boolean);
    const act = (currentSearch.actives || '').split(',').map(s => s.trim()).filter(Boolean);

    if (q) chips.push({ key: 'q', label: `Поиск: ${q}`, value: q });
    if (min) chips.push({ key: 'min', label: `Цена от: ${min}`, value: min });
    if (max) chips.push({ key: 'max', label: `Цена до: ${max}`, value: max });
    if (sale === '1') chips.push({ key: 'sale', label: 'Со скидкой' });

    const brandMap = new Map(brands.map(b => [b.slug, b.name] as const));
    for (const s of br) chips.push({ key: 'brands', label: `Бренд: ${brandMap.get(s) || s}`, value: s });

    const catMap = new Map(categories.map(c => [c.slug, c.name] as const));
    for (const s of cat) chips.push({ key: 'categories', label: `Категория: ${catMap.get(s) || s}`, value: s });

    const allAttr = new Map<string, string>();
    const attrGroupMap = new Map<string, string>(); // slug группы -> название группы
    for (const g of attrGroups) {
      attrGroupMap.set(g.slug, g.name);
      for (const v of g.values) allAttr.set(v.slug, v.name);
    }
    
    for (const s of skin) chips.push({ key: 'skin', label: `Кожа: ${allAttr.get(s) || s}`, value: s });
    for (const s of goals) chips.push({ key: 'goals', label: `Цель: ${allAttr.get(s) || s}`, value: s });
    for (const s of act) chips.push({ key: 'actives', label: `Актив: ${allAttr.get(s) || s}`, value: s });
    
    // Обрабатываем остальные группы атрибутов
    for (const [key, value] of Object.entries(currentSearch)) {
      if (key && typeof value === 'string' && !['q', 'min', 'max', 'sale', 'brands', 'categories', 'skin', 'goals', 'actives', 'scenarioId', 'assist'].includes(key)) {
        const slugs = value.split(',').map(s => s.trim()).filter(Boolean);
        const groupName = attrGroupMap.get(key) || key;
        for (const slug of slugs) {
          chips.push({ key, label: `${groupName}: ${allAttr.get(slug) || slug}`, value: slug });
        }
      }
    }

    return chips;
  }, [currentSearch, brands, categories, attrGroups]);

  function removeChip(key: string, value?: string) {
    const next = new URLSearchParams(sp.toString());
    // Проверяем, является ли это группой атрибутов
    const isAttributeGroup = attrGroups.some(g => g.slug === key);
    
    if (!value || (!['brands', 'categories', 'skin', 'goals', 'actives'].includes(key) && !isAttributeGroup)) {
      next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
      return;
    }
    
    // Для групп атрибутов и других фильтров с множественными значениями
    const raw = next.get(key) || '';
    const arr = raw.split(',').map(s => s.trim()).filter(Boolean).filter(v => v !== value);
    if (arr.length) next.set(key, arr.join(','));
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAllFilters() {
    router.push(pathname);
  }

  const visibleProducts = useMemo(() => {
    const filtered = products.filter(p => p.isActive);
    
    // Удаляем дубликаты по ID
    const uniqueProducts = Array.from(
      new Map(filtered.map(p => [p.id, p])).values()
    );
    
    // Сортировка
    const sorted = [...uniqueProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'newest':
          // Сортируем по id (больше id = новее)
          return (b.id || 0) - (a.id || 0);
        case 'oldest':
          return (a.id || 0) - (b.id || 0);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [products, sortBy]);

  // Восстанавливаем позицию скролла при возврате в каталог
  useEffect(() => {
    try {
      const savedProductId = localStorage.getItem("musthave_catalog_product_id");
      const savedScroll = localStorage.getItem("musthave_catalog_scroll");
      const savedParams = localStorage.getItem("musthave_catalog_params");
      
      // Проверяем, совпадают ли текущие параметры с сохраненными
      let shouldRestore = false;
      if (savedParams) {
        try {
          const saved = JSON.parse(savedParams);
          const current = currentSearch;
          
          // Сравниваем ключевые параметры
          const keysToCheck = ['q', 'min', 'max', 'sale', 'brands', 'categories', 'skin', 'goals', 'actives', 'scenarioId', 'assist'];
          shouldRestore = keysToCheck.every(key => {
            const savedVal = saved[key] || '';
            const currentVal = current[key] || '';
            return savedVal === currentVal;
          });
        } catch (e) {
          // Если не удалось сравнить, все равно пытаемся восстановить
          shouldRestore = true;
        }
      } else {
        // Если нет сохраненных параметров, но есть сохраненный товар, восстанавливаем
        shouldRestore = !!savedProductId;
      }
      
      if (shouldRestore && savedProductId) {
        // Небольшая задержка для того, чтобы товары успели отрендериться
        const timer = setTimeout(() => {
          // Пытаемся найти элемент товара по ID
          const productElement = document.querySelector(`[data-product-id="${savedProductId}"]`);
          
          if (productElement) {
            // Прокручиваем к товару с небольшим отступом сверху
            productElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          } else if (savedScroll) {
            // Если товар не найден, восстанавливаем позицию скролла
            const scrollPos = parseInt(savedScroll, 10);
            if (!isNaN(scrollPos)) {
              window.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
          }
          
          // Очищаем сохраненные данные после восстановления
          localStorage.removeItem("musthave_catalog_product_id");
          localStorage.removeItem("musthave_catalog_scroll");
        }, 300);
        
        return () => clearTimeout(timer);
      } else if (savedProductId) {
        // Если параметры не совпадают, очищаем сохраненные данные
        localStorage.removeItem("musthave_catalog_product_id");
        localStorage.removeItem("musthave_catalog_scroll");
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }, [visibleProducts, currentSearch]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold dark:text-white">Каталог</h1>
      </div>
      
      {/* Баннер реферального приглашения */}
      <ReferralBanner />

      {/* Блок про бонусы участникам */}
      <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/30">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎁</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              Клуб для клиентов MustHave
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-300">
              Участники получают кэшбэк и бонусы за друзей
            </p>
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Войти можно по приглашению или после первой покупки
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Фильтры слева */}
        {!filtersCollapsed && (
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-4">
              {/* Кнопка сворачивания на мобильных */}
              <div className="lg:hidden mb-4">
                <button
                  type="button"
                  onClick={() => setFiltersCollapsed(true)}
                  className="w-full flex items-center justify-end px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <CatalogFilters
                initialQuery={currentSearch.q || ''}
                initialMin={currentSearch.min || ''}
                initialMax={currentSearch.max || ''}
                initialSale={currentSearch.sale === '1'}
                initialBrands={(currentSearch.brands || '').split(',').filter(Boolean)}
                initialCategories={(currentSearch.categories || '').split(',').filter(Boolean)}
                initialSkin={(currentSearch.skin || '').split(',').filter(Boolean)}
                initialGoals={(currentSearch.goals || '').split(',').filter(Boolean)}
                initialActives={(currentSearch.actives || '').split(',').filter(Boolean)}
                brands={brands}
                categories={categories}
                attrGroups={attrGroups}
              />
            </div>
          </aside>
        )}

        {/* Товары справа */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Кнопка показа/скрытия фильтров */}
              <button
                type="button"
                onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 transition-colors text-sm"
                title={filtersCollapsed ? "Показать фильтры" : "Скрыть фильтры"}
              >
                {filtersCollapsed ? (
                  <>
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">🔍 Фильтры</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Скрыть</span>
                  </>
                )}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-full border bg-white px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              >
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
                <option value="price-asc">Цена: по возрастанию</option>
                <option value="price-desc">Цена: по убыванию</option>
              </select>
              {activeChips.map((chip, idx) => (
                <button
                  key={`${chip.key}:${chip.value || ''}:${idx}`}
                  type="button"
                  onClick={() => removeChip(chip.key, chip.value)}
                  className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                  title="Убрать фильтр"
                >
                  <span>{chip.label}</span>
                  <span className="text-gray-500 dark:text-gray-400">✕</span>
                </button>
              ))}
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                >
                  Сбросить всё
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300">
                По выбранным фильтрам ничего не найдено.
              </div>
            ) : (
              visibleProducts.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
