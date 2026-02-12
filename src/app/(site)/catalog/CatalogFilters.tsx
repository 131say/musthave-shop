"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-t-2xl transition-colors"
      >
        <h3 className="text-sm font-semibold dark:text-white">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}

type BrandItem = { slug: string; name: string; count: number };
type CategoryItem = { id: number; name: string; slug: string; count: number };
type AttrValueItem = { id: number; name: string; slug: string; count: number };
type AttrGroupItem = { id: number; name: string; slug: string; values: AttrValueItem[] };

export default function CatalogFilters(props: {
  initialQuery: string;
  initialMin: string;
  initialMax: string;
  initialSale: boolean;
  initialBrands: string[];
  initialCategories: string[];
  initialSkin: string[];
  initialGoals: string[];
  initialActives: string[];
  brands: BrandItem[];
  categories: CategoryItem[];
  attrGroups: AttrGroupItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(props.initialQuery || "");
  const [min, setMin] = useState(props.initialMin || "");
  const [max, setMax] = useState(props.initialMax || "");
  const [sale, setSale] = useState(Boolean(props.initialSale));
  const [selectedBrands, setSelectedBrands] = useState<string[]>(props.initialBrands || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(props.initialCategories || []);
  const [skin, setSkin] = useState<string[]>(props.initialSkin || []);
  const [goals, setGoals] = useState<string[]>(props.initialGoals || []);
  const [actives, setActives] = useState<string[]>(props.initialActives || []);
  
  // Динамическое состояние для всех остальных групп атрибутов
  const [attributeStates, setAttributeStates] = useState<Record<string, string[]>>({});

  const brands = useMemo(() => props.brands || [], [props.brands]);
  const categories = useMemo(() => props.categories || [], [props.categories]);
  const attrGroups = useMemo(() => props.attrGroups || [], [props.attrGroups]);

  // Инициализация состояний для всех групп атрибутов
  useEffect(() => {
    const newAttributeStates: Record<string, string[]> = {};
    for (const group of attrGroups) {
      if (group.slug === 'skin-type' || group.slug === 'goals' || group.slug === 'actives') {
        continue; // Эти обрабатываются отдельно
      }
      const paramKey = group.slug;
      const currentValues = (searchParams.get(paramKey) || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
      if (currentValues.length > 0) {
        newAttributeStates[paramKey] = currentValues;
      }
    }
    setAttributeStates(newAttributeStates);
  }, [attrGroups, searchParams.toString()]);

  // Синхронизация состояния с URL параметрами при их изменении извне (например, при удалении чипа)
  useEffect(() => {
    const currentCategories = (searchParams.get('categories') || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
    const currentBrands = (searchParams.get('brands') || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
    const currentSkin = (searchParams.get('skin') || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
    const currentGoals = (searchParams.get('goals') || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
    const currentActives = (searchParams.get('actives') || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
    
    const categoriesChanged = JSON.stringify([...currentCategories].sort()) !== JSON.stringify([...selectedCategories].sort());
    const brandsChanged = JSON.stringify([...currentBrands].sort()) !== JSON.stringify([...selectedBrands].sort());
    const skinChanged = JSON.stringify([...currentSkin].sort()) !== JSON.stringify([...skin].sort());
    const goalsChanged = JSON.stringify([...currentGoals].sort()) !== JSON.stringify([...goals].sort());
    const activesChanged = JSON.stringify([...currentActives].sort()) !== JSON.stringify([...actives].sort());
    
    if (categoriesChanged) {
      setSelectedCategories(currentCategories);
    }
    if (brandsChanged) {
      setSelectedBrands(currentBrands);
    }
    if (skinChanged) {
      setSkin(currentSkin);
    }
    if (goalsChanged) {
      setGoals(currentGoals);
    }
    if (activesChanged) {
      console.log('[CatalogFilters] Синхронизация активов: URL=', currentActives, 'State=', actives);
      setActives(currentActives);
    }
    
    // Синхронизация остальных групп атрибутов
    const newAttributeStates: Record<string, string[]> = {};
    for (const group of attrGroups) {
      if (group.slug === 'skin-type' || group.slug === 'goals' || group.slug === 'actives') {
        continue;
      }
      const paramKey = group.slug;
      const currentValues = (searchParams.get(paramKey) || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
      if (currentValues.length > 0 || attributeStates[paramKey]?.length > 0) {
        newAttributeStates[paramKey] = currentValues;
      }
    }
    if (JSON.stringify(newAttributeStates) !== JSON.stringify(attributeStates)) {
      setAttributeStates(newAttributeStates);
    }
  }, [searchParams.toString(), attrGroups]);
  
  // Автодополнение
  const [suggestions, setSuggestions] = useState<Array<{ id: number; name: string; slug: string; brandName: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Загрузка подсказок с debounce
  useEffect(() => {
    const query = q.trim();
    
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/products/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.ok && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Ошибка загрузки подсказок:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [q]);

  // Закрытие подсказок при клике вне
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSuggestionClick(suggestion: { id: number; name: string; slug: string; brandName: string }) {
    setQ(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }

  function toggleBrand(slug: string) {
    const newBrands = selectedBrands.includes(slug) 
      ? selectedBrands.filter((s) => s !== slug) 
      : [...selectedBrands, slug];
    setSelectedBrands(newBrands);
    
    // Сразу применяем фильтр брендов
    const sp = new URLSearchParams(searchParams.toString());
    if (newBrands.length) {
      sp.set("brands", newBrands.join(","));
    } else {
      sp.delete("brands");
    }
    router.push(`/catalog?${sp.toString()}`);
  }

  function toggleCategory(slug: string) {
    const newCategories = selectedCategories.includes(slug) 
      ? selectedCategories.filter((s) => s !== slug) 
      : [...selectedCategories, slug];
    setSelectedCategories(newCategories);
    
    // Сразу применяем фильтр категорий
    const sp = new URLSearchParams(searchParams.toString());
    if (newCategories.length) {
      sp.set("categories", newCategories.join(","));
    } else {
      sp.delete("categories");
    }
    router.push(`/catalog?${sp.toString()}`);
  }

  function toggleIn(setter: (fn: (p: string[]) => string[]) => void, slug: string, paramKey: 'skin' | 'goals' | 'actives') {
    const currentState = paramKey === 'skin' ? skin : paramKey === 'goals' ? goals : actives;
    const newState = currentState.includes(slug) 
      ? currentState.filter((x) => x !== slug) 
      : [...currentState, slug];
    
    console.log(`[CatalogFilters] toggleIn: paramKey=${paramKey}, slug=${slug}, currentState=`, currentState, 'newState=', newState);
    
    // Обновляем состояние
    setter(() => newState);
    
    // Сразу применяем фильтр атрибутов
    const sp = new URLSearchParams(searchParams.toString());
    if (newState.length > 0) {
      sp.set(paramKey, newState.join(","));
    } else {
      sp.delete(paramKey);
    }
    
    const newUrl = sp.toString() ? `/catalog?${sp.toString()}` : "/catalog";
    console.log(`[CatalogFilters] Переход на URL: ${newUrl}`);
    router.push(newUrl);
  }

  // Универсальная функция для переключения любых атрибутов
  function toggleAttribute(groupSlug: string, valueSlug: string) {
    const currentState = attributeStates[groupSlug] || [];
    const newState = currentState.includes(valueSlug)
      ? currentState.filter((x) => x !== valueSlug)
      : [...currentState, valueSlug];
    
    console.log(`[CatalogFilters] toggleAttribute: groupSlug=${groupSlug}, valueSlug=${valueSlug}, newState=`, newState);
    
    // Обновляем состояние
    setAttributeStates(prev => ({
      ...prev,
      [groupSlug]: newState
    }));
    
    // Сразу применяем фильтр
    const sp = new URLSearchParams(searchParams.toString());
    if (newState.length > 0) {
      sp.set(groupSlug, newState.join(","));
    } else {
      sp.delete(groupSlug);
    }
    
    const newUrl = sp.toString() ? `/catalog?${sp.toString()}` : "/catalog";
    router.push(newUrl);
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
    router.push("/catalog");
  }

  return (
    <div className="space-y-4">
      {/* Поиск и цена */}
      <CollapsibleSection title="Поиск" defaultOpen={true}>
        <div className="space-y-3">
          <div className="space-y-1 relative">
            <label className="block">
              <div className="text-xs text-gray-600 dark:text-gray-300">Название</div>
            </label>
            <div className="relative">
              <input 
                ref={inputRef}
                className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white" 
                value={q} 
                onChange={(e) => {
                  setQ(e.target.value);
                  setSelectedIndex(-1);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Название или описание" 
              />
              {isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              {/* Выпадающий список подсказок */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-64 overflow-auto dark:bg-neutral-900 dark:border-neutral-800"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left px-4 py-2 transition-colors border-b last:border-b-0 dark:border-neutral-800 ${
                        index === selectedIndex
                          ? 'bg-gray-100 dark:bg-neutral-800'
                          : 'hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="font-medium text-sm dark:text-white">{suggestion.name}</div>
                      {suggestion.brandName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{suggestion.brandName}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 block">
              <div className="text-xs text-gray-600 dark:text-gray-300">Цена от</div>
              <input 
                className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white" 
                value={min} 
                onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))} 
              />
            </label>
            <label className="space-y-1 block">
              <div className="text-xs text-gray-600 dark:text-gray-300">Цена до</div>
              <input 
                className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white" 
                value={max} 
                onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))} 
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sale} onChange={(e) => setSale(e.target.checked)} />
            <span className="text-sm font-medium dark:text-white">Специальные предложения</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button 
              className="flex-1 rounded-xl px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 transition-colors" 
              onClick={onApply}
            >
              Применить
            </button>
            <button 
              className="flex-1 rounded-xl px-4 py-2 text-sm border hover:bg-gray-50 dark:border-neutral-800 dark:text-white dark:hover:bg-neutral-800 transition-colors" 
              onClick={onReset}
            >
              Сбросить
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Категории */}
      <CollapsibleSection title="Категории" defaultOpen={true}>
        <div className="space-y-1.5">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center justify-between gap-3 text-sm dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 rounded px-2 py-1.5 -mx-2 transition-colors">
              <span className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={selectedCategories.includes(c.slug)} 
                  onChange={() => toggleCategory(c.slug)} 
                  className="cursor-pointer"
                />
                <span>{c.name}</span>
              </span>
              {c.count > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{c.count}</span>
              )}
            </label>
          ))}
          {!categories.length ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">Категорий пока нет</div>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* Бренды */}
      <CollapsibleSection title="Бренд" defaultOpen={true}>
        <div className="space-y-1.5">
          {brands.map((b) => (
            <label key={b.slug} className="flex items-center justify-between gap-3 text-sm dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 rounded px-2 py-1.5 -mx-2 transition-colors">
              <span className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={selectedBrands.includes(b.slug)} 
                  onChange={() => toggleBrand(b.slug)} 
                  className="cursor-pointer"
                />
                <span>{b.name}</span>
              </span>
              {b.count > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{b.count}</span>
              )}
            </label>
          ))}
        </div>
      </CollapsibleSection>

      {/* Атрибуты */}
      {attrGroups.map((g) => {
        // Определяем состояние в зависимости от группы
        let state: string[];
        let onChange: (slug: string) => void;
        
        if (g.slug === "skin-type") {
          state = skin;
          onChange = (slug: string) => toggleIn(setSkin, slug, 'skin');
        } else if (g.slug === "goals") {
          state = goals;
          onChange = (slug: string) => toggleIn(setGoals, slug, 'goals');
        } else if (g.slug === "actives") {
          state = actives;
          onChange = (slug: string) => toggleIn(setActives, slug, 'actives');
        } else {
          // Для всех остальных групп используем универсальную функцию
          state = attributeStates[g.slug] || [];
          onChange = (slug: string) => toggleAttribute(g.slug, slug);
        }
        
        return (
          <CollapsibleSection key={g.id} title={g.name} defaultOpen={true}>
            <div className="space-y-1.5">
              {g.values.map((v) => (
                <label key={v.id} className="flex items-center justify-between gap-3 text-sm dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 rounded px-2 py-1.5 -mx-2 transition-colors">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state.includes(v.slug)}
                      onChange={() => onChange(v.slug)}
                      className="cursor-pointer"
                    />
                    <span>{v.name}</span>
                  </span>
                  {v.count > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{v.count}</span>
                  )}
                </label>
              ))}
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}


