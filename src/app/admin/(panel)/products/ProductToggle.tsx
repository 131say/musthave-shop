// src/app/admin/products/ProductToggle.tsx
'use client';

import { useState } from 'react';

export default function ProductToggle({
  productId,
  initialActive,
}: {
  productId: number;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !active;
    setActive(next);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, isActive: next }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Ошибка');
      }
    } catch (e: any) {
      setActive(!next);
      alert(e?.message || 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`h-8 w-14 rounded-full border px-1 transition ${
        active
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30'
          : 'border-slate-200 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800'
      } ${loading ? 'opacity-60' : ''}`}
      title={active ? 'Активен' : 'Выключен'}
    >
      <span
        className={`block h-6 w-6 rounded-full bg-white shadow transition dark:bg-neutral-700 ${
          active ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}







