"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

type BrandItem = { slug: string; name: string; count: number };
type CategoryItem = { slug: string; name: string; parentId: number | null };
type AttrValueItem = { id: number; name: string; slug: string; count: number };
type AttrGroupItem = { id: number; name: string; slug: string; values: AttrValueItem[] };

export default function CatalogFiltersPanel(props: {
  isOpen: boolean;
  onClose: () => void;
  q: string;
  min: string;
  max: string;
  sale: boolean;
  brands: string;
  initialBrands: BrandItem[];
  categories: string;
  initialCategories: CategoryItem[];
  skin: string;
  goals: string;
  actives: string;
  initialAttrGroups: AttrGroupItem[];
  currentSearchParams: URLSearchParams;
}) {
  const router = useRouter();
  const [q, setQ] = useState(props.q || "");
  const [min, setMin] = useState(props.min || "");
  const [max, setMax] = useState(props.max || "");
  const [sale, setSale] = useState(Boolean(props.sale));
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    (props.brands || '').split(',').map((x) => x.trim()).filter(Boolean)
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    (props.categories || '').split(',').map((x) => x.trim()).filter(Boolean)
  );
  const [skin, setSkin] = useState<string[]>(
    (props.skin || '').split(',').map((x) => x.trim()).filter(Boolean)
  );
  const [goals, setGoals] = useState<string[]>(
    (props.goals || '').split(',').map((x) => x.trim()).filter(Boolean)
  );
  const [actives, setActives] = useState<string[]>(
    (props.actives || '').split(',').map((x) => x.trim()).filter(Boolean)
  );

  // Синхронизируем состояние при изменении props
  useEffect(() => {
    setQ(props.q || "");
    setMin(props.min || "");
    setMax(props.max || "");
    setSale(Boolean(props.sale));
    setSelectedBrands((props.brands || '').split(',').map((x) => x.trim()).filter(Boolean));
    setSelectedCategories((props.categories || '').split(',').map((x) => x.trim()).filter(Boolean));
    setSkin((props.skin || '').split(',').map((x) => x.trim()).filter(Boolean));
    setGoals((props.goals || '').split(',').map((x) => x.trim()).filter(Boolean));
    setActives((props.actives || '').split(',').map((x) => x.trim()).filter(Boolean));
  }, [props.q, props.min, props.max, props.sale, props.brands, props.categories, props.skin, props.goals, props.actives]);

  const brands = useMemo(() => props.initialBrands || [], [props.initialBrands]);
  const categories = useMemo(() => props.initialCategories || [], [props.initialCategories]);
  const attrGroups = useMemo(() => props.initialAttrGroups || [], [props.initialAttrGroups]);

  function toggleBrand(slug: string) {
    setSelectedBrands((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function toggleIn(setter: (fn: (p: string[]) => string[]) => void, slug: string) {
    setter((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));
  }

  function buildUrl() {
    // Создаём новый URLSearchParams, чтобы не сохранять старые параметры из assist режима
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (min.trim()) sp.set("min", min.trim().replace(/[^\d]/g, ""));
    if (max.trim()) sp.set("max", max.trim().replace(/[^\d]/g, ""));
    if (sale) sp.set("sale", "1");
    if (selectedBrands.length) sp.set("brands", selectedBrands.join(","));
    if (selectedCategories.length) sp.set("categories", selectedCategories.join(","));
    if (skin.length) sp.set("skin", skin.join(","));
    if (goals.length) sp.set("goals", goals.join(","));
    if (actives.length) sp.set("actives", actives.join(","));
    // Удаляем параметры assist режима, чтобы они не сохранялись при применении фильтров
    const qs = sp.toString();
    return qs ? `/catalog?${qs}` : "/catalog";
  }

  function onApply() {
    router.push(buildUrl());
    props.onClose();
  }

  function onReset() {
    setQ("");
    setMin("");
    setMax("");
    setSale(false);
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSkin([]);
    setGoals([]);
    setActives([]);
    const sp = new URLSearchParams(props.currentSearchParams.toString());
    sp.delete("q");
    sp.delete("min");
    sp.delete("max");
    sp.delete("sale");
    sp.delete("brands");
    sp.delete("categories");
    sp.delete("skin");
    sp.delete("goals");
    sp.delete("actives");
    const qs = sp.toString();
    router.push(qs ? `/catalog?${qs}` : "/catalog");
    props.onClose();
  }

  if (!props.isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={props.onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto dark:bg-neutral-900 dark:border-neutral-800">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between dark:bg-neutral-900 dark:border-neutral-800">
          <h2 className="text-lg font-semibold dark:text-white">Фильтры</h2>
          <button
            onClick={props.onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Поиск и цена */}
          <div className="space-y-4">
            <label className="space-y-1 block">
              <div className="text-sm text-gray-600 dark:text-gray-300">Поиск</div>
              <input
                className="w-full rounded-xl border px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Название или описание"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1 block">
                <div className="text-sm text-gray-600 dark:text-gray-300">Цена от</div>
                <input
                  className="w-full rounded-xl border px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  value={min}
                  onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
              <label className="space-y-1 block">
                <div className="text-sm text-gray-600 dark:text-gray-300">Цена до</div>
                <input
                  className="w-full rounded-xl border px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  value={max}
                  onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Подбор не зависит от цены
              <br />
              Но ты можешь задать комфортный диапазон
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sale}
                onChange={(e) => setSale(e.target.checked)}
              />
              <span className="font-medium dark:text-white">Специальные предложения</span>
            </label>
          </div>

          {/* Категории */}
          <div className="rounded-2xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm font-semibold mb-3 dark:text-white">Категории</div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {categories.map((c) => (
                <label key={c.slug} className="flex items-center justify-between gap-3 text-sm dark:text-gray-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(c.slug)}
                      onChange={() => toggleCategory(c.slug)}
                    />
                    <span>{c.name}</span>
                  </span>
                </label>
              ))}
              {!categories.length ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Категорий пока нет</div>
              ) : null}
            </div>
          </div>

          {/* Бренды */}
          <div className="rounded-2xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm font-semibold mb-3 dark:text-white">Бренд</div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {brands.map((b) => (
                <label key={b.slug} className="flex items-center justify-between gap-3 text-sm dark:text-gray-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b.slug)}
                      onChange={() => toggleBrand(b.slug)}
                    />
                    <span>{b.name}</span>
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">{b.count}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Атрибуты */}
          {attrGroups.map((g) => {
            const state = g.slug === "skin-type" ? skin : g.slug === "goals" ? goals : actives;
            const setter =
              g.slug === "skin-type"
                ? setSkin
                : g.slug === "goals"
                ? setGoals
                : setActives;
            return (
              <div key={g.id} className="rounded-2xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="text-sm font-semibold mb-1 dark:text-white">{g.name}</div>
                {g.slug === "skin-type" && (
                  <p className="text-xs text-slate-500 mb-3 dark:text-gray-400">
                    Не обязательно
                    <br />
                    Если сомневаешься — оставь пустым
                  </p>
                )}
                {g.slug === "actives" && (
                  <p className="text-xs text-slate-500 mb-3 dark:text-gray-400">
                    Выбирай, если уже знаешь, что тебе подходит
                    <br />
                    Или доверься нашему подбору
                  </p>
                )}
                <div className="space-y-2 max-h-64 overflow-auto">
                  {g.values.map((v) => (
                    <label key={v.id} className="flex items-center justify-between gap-3 text-sm dark:text-gray-300">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.includes(v.slug)}
                          onChange={() => toggleIn(setter, v.slug)}
                        />
                        <span>{v.name}</span>
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">{v.count}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Кнопки действий */}
          <div className="flex gap-2 pt-4 border-t dark:border-neutral-800">
            <button
              className="flex-1 rounded-xl px-5 py-2 bg-amber-600 text-white hover:bg-amber-700"
              onClick={onApply}
            >
              Применить
            </button>
            <button
              className="flex-1 rounded-xl px-5 py-2 border hover:bg-gray-50 dark:border-neutral-800 dark:text-white dark:hover:bg-neutral-800"
              onClick={onReset}
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

