'use client';

import React from 'react';

export type CatalogMode = 'assist' | 'expert';

export function ModeToggle({
  mode,
  onChange,
  variant = 'header',
}: {
  mode: CatalogMode;
  onChange: (m: CatalogMode) => void;
  variant?: 'header' | 'footer';
}) {
  return (
    <div
      className={[
        'inline-flex rounded-full border bg-white p-1 shadow-sm',
        variant === 'footer' ? 'w-full justify-center' : '',
      ].join(' ')}
      role="tablist"
      aria-label="Режим каталога"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'assist'}
        onClick={() => onChange('assist')}
        className={[
          'px-3 py-1.5 text-sm rounded-full transition',
          mode === 'assist' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100',
        ].join(' ')}
      >
        Подбор
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'expert'}
        onClick={() => onChange('expert')}
        className={[
          'px-3 py-1.5 text-sm rounded-full transition',
          mode === 'expert' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100',
        ].join(' ')}
      >
        Каталог
      </button>
    </div>
  );
}
