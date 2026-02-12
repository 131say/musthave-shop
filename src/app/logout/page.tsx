// src/app/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearCart } from '@/lib/cart';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const doLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        // Очищаем корзину при выходе
        clearCart();
        // Очищаем сохраненный userId
        if (typeof window !== 'undefined') {
          localStorage.removeItem('musthave_lastUserId');
        }
      } catch (e) {
        // игнорируем, главное — убрать куки на сервере
      } finally {
        router.replace('/');
      }
    };

    doLogout();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-white px-4">
      <div className="rounded-3xl border border-neutral-200 bg-white/90 px-6 py-4 text-sm text-neutral-500 shadow-sm shadow-amber-100">
        Выходим из аккаунта...
      </div>
    </div>
  );
}







