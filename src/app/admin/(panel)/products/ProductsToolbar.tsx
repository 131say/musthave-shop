// src/app/admin/products/ProductsToolbar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Category = { id: number; name: string; slug: string; parentId: number | null };
type Brand = { id: number; name: string; slug: string };
type AttrValue = { id: number; name: string; slug: string; groupId: number };
type AttrGroup = { id: number; name: string; slug: string; values: AttrValue[] };

export default function ProductsToolbar({
  initialQ,
  initialStatus,
  initialCategoryIds,
  initialBrandIds,
  initialAttrValueIds,
  initialPriceFrom,
  initialPriceTo,
  categories,
  brands,
  attrGroups,
}: {
  initialQ: string;
  initialStatus: string;
  initialCategoryIds: number[];
  initialBrandIds: number[];
  initialAttrValueIds: number[];
  initialPriceFrom: number | null;
  initialPriceTo: number | null;
  categories: Category[];
  brands: Brand[];
  attrGroups: AttrGroup[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus || 'ALL');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(initialCategoryIds || []);
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>(initialBrandIds || []);
  const [selectedAttrValueIds, setSelectedAttrValueIds] = useState<number[]>(initialAttrValueIds || []);
  const [priceFrom, setPriceFrom] = useState(initialPriceFrom?.toString() || '');
  const [priceTo, setPriceTo] = useState(initialPriceTo?.toString() || '');

  const apply = () => {
    const sp = new URLSearchParams();
    const trimmedQ = q.trim();
    if (trimmedQ) sp.set('q', trimmedQ);
    if (status && status !== 'ALL') sp.set('status', status);
    
    selectedCategoryIds.forEach(id => sp.append('categoryIds', String(id)));
    selectedBrandIds.forEach(id => sp.append('brandIds', String(id)));
    selectedAttrValueIds.forEach(id => sp.append('attrValueIds', String(id)));
    
    const trimmedPriceFrom = priceFrom.trim();
    const trimmedPriceTo = priceTo.trim();
    if (trimmedPriceFrom) sp.set('priceFrom', trimmedPriceFrom);
    if (trimmedPriceTo) sp.set('priceTo', trimmedPriceTo);

    const qs = sp.toString();
    router.push(qs ? `/admin/products?${qs}` : '/admin/products');
  };

  const reset = () => {
    setQ('');
    setStatus('ALL');
    setSelectedCategoryIds([]);
    setSelectedBrandIds([]);
    setSelectedAttrValueIds([]);
    setPriceFrom('');
    setPriceTo('');
    router.push('/admin/products');
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleBrand = (id: number) => {
    setSelectedBrandIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAttrValue = (id: number) => {
    setSelectedAttrValueIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-4">
            <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Поиск</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') apply();
              }}
              placeholder="По названию или описанию"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Статус</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
            >
              <option value="ALL">Все</option>
              <option value="ACTIVE">Активные</option>
              <option value="INACTIVE">Выключенные</option>
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Цена от</div>
            <input
              type="number"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Цена до</div>
            <input
              type="number"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              placeholder="100000"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={reset}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Сбросить
          </button>
          <button
            onClick={apply}
            className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white hover:bg-rose-600"
          >
            Применить фильтры
          </button>
        </div>
      </div>

      {/* Категории */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Категории</div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-lg px-3 py-1 text-xs transition ${
                    isSelected
                      ? 'bg-rose-500 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Бренды */}
      {brands.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Бренды</div>
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => {
              const isSelected = selectedBrandIds.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  onClick={() => toggleBrand(brand.id)}
                  className={`rounded-lg px-3 py-1 text-xs transition ${
                    isSelected
                      ? 'bg-rose-500 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
                  }`}
                >
                  {brand.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Атрибуты */}
      {attrGroups.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-3">Атрибуты</div>
          <div className="space-y-3">
            {attrGroups.map((group) => (
              <div key={group.id}>
                <div className="text-xs font-semibold text-slate-700 dark:text-gray-300 mb-2">{group.name}</div>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => {
                    const isSelected = selectedAttrValueIds.includes(value.id);
                    return (
                      <button
                        key={value.id}
                        onClick={() => toggleAttrValue(value.id)}
                        className={`rounded-lg px-3 py-1 text-xs transition ${
                          isSelected
                            ? 'bg-rose-500 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {value.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
