// src/components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearCart } from '@/lib/cart';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Очищаем корзину при выходе
      clearCart();
      // Очищаем сохраненный userId
      if (typeof window !== 'undefined') {
        localStorage.removeItem('musthave_lastUserId');
      }
      router.push('/login');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-slate-200 dark:border-neutral-700 px-4 py-1.5 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50"
    >
      {loading ? 'Выход...' : 'Выйти'}
    </button>
  );
}







