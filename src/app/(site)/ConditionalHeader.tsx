"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import UserBar from '@/components/UserBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function ConditionalHeader({ showHeader = false }: { showHeader?: boolean }) {
  const pathname = usePathname();
  const isCheckoutPage = pathname?.startsWith('/checkout');
  const isFavoritesPage = pathname === '/favorites';
  const isAccountPage = pathname === '/account';
  
  if (showHeader) {
    if (isCheckoutPage || isFavoritesPage || isAccountPage) {
      return null; // Шапка для чекаута, избранного и кабинета в самих компонентах
    }
    
    return (
      <header className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Musthave.kz • Kazakhstan
            </span>
          </div>
          <Link href="/home" className="block">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight dark:text-white">
              MustHave
            </h1>
          </Link>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 hidden sm:block">
            Косметика и уход с доставкой по всему Казахстану и
            реферальной программой.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <UserBar />
        </div>
      </header>
    );
  }
  
  // Тoggle темы
  if (!isCheckoutPage && !isFavoritesPage && !isAccountPage) {
    return (
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <ThemeToggle />
      </div>
    );
  }
  
  return null;
}
