"use client";

import { useState } from "react";
import CatalogFiltersPanel from "./CatalogFiltersPanel";

type BrandItem = { slug: string; name: string; count: number };
type CategoryItem = { slug: string; name: string; parentId: number | null };
type AttrValueItem = { id: number; name: string; slug: string; count: number };
type AttrGroupItem = { id: number; name: string; slug: string; values: AttrValueItem[] };

export default function RefineSelection(props: {
  q: string;
  min: string;
  max: string;
  sale: boolean;
  brands: string;
  categories: string;
  skin: string;
  goals: string;
  actives: string;
  initialBrands: BrandItem[];
  initialCategories: CategoryItem[];
  initialAttrGroups: AttrGroupItem[];
  currentSearchParams: URLSearchParams;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <>
      <div className="mt-8 rounded-2xl border border-rose-100 bg-white">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-rose-50 transition-colors"
        >
          <span className="font-medium text-slate-900">Уточнить подбор</span>
          <span className="text-2xl text-slate-400">{isExpanded ? "−" : "+"}</span>
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2 border-t border-rose-100">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Ты можешь уточнить подбор, выбрав дополнительные параметры
              </p>
              <button
                onClick={() => setIsFiltersOpen(true)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 flex items-center gap-2"
              >
                <span>⚙</span>
                Открыть фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      <CatalogFiltersPanel
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        q={props.q}
        min={props.min}
        max={props.max}
        sale={props.sale}
        brands={props.brands}
        categories={props.categories}
        skin={props.skin}
        goals={props.goals}
        actives={props.actives}
        initialBrands={props.initialBrands}
        initialCategories={props.initialCategories}
        initialAttrGroups={props.initialAttrGroups}
        currentSearchParams={props.currentSearchParams}
      />
    </>
  );
}



