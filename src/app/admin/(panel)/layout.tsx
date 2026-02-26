// src/app/admin/(panel)/layout.tsx
// Этот layout применяется только к защищённым страницам админки (внутри route group (panel))
// Страница /admin/login находится вне этого route group и не использует этот layout
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ThemeInit from '@/components/ThemeInit';
import ThemeToggle from '@/components/ThemeToggle';

const menu = [
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/products', label: 'Товары' },
  { href: '/admin/products/new', label: 'Создать товар' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/stats', label: 'Аналитика' },
  { href: '/admin/referrals', label: 'Рефералы' },
  { href: '/admin/referrals-analytics', label: 'Аналитика рефералов' },
  { href: '/admin/requests', label: 'Запросы' },
  { href: '/admin/chats', label: 'Чаты' },
  { href: '/admin/news', label: 'Новости' },
  { href: '/admin/settings', label: 'Настройки' },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  // Загрузка количества непрочитанных чатов
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const res = await fetch("/api/support/chats");
        const data = await res.json();
        if (data.ok && data.chats) {
          const unreadCount = data.chats.filter((c: any) => c.unreadCount > 0).length;
          setUnreadChatsCount(unreadCount);
        }
      } catch (e) {
        console.error("Failed to load unread chats count:", e);
      }
    };

    loadUnreadCount();
    // Обновляем каждые 30 секунд, если не на странице чатов (снижаем нагрузку на БД и Vercel)
    if (pathname !== '/admin/chats') {
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [pathname]);

  return (
    <div className="min-h-screen dark:bg-neutral-950">
      <ThemeInit />
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="flex min-h-screen bg-slate-50 dark:bg-neutral-950">
        {/* Overlay для мобильных */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Кнопка открытия меню для мобильных */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-slate-200 dark:bg-neutral-900 dark:border-neutral-800 md:hidden"
          aria-label="Открыть меню"
        >
          <svg
            className="w-6 h-6 text-slate-700 dark:text-gray-300"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Левое меню */}
        <aside
          className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 p-4 dark:bg-neutral-900 dark:border-neutral-800 z-40 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-6 min-w-0">
            <div className="text-xl font-semibold dark:text-white truncate">MustHave Admin</div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800"
              aria-label="Закрыть меню"
            >
              <svg
                className="w-6 h-6 text-slate-700 dark:text-gray-300"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {menu.map((item) => {
              const isChats = item.href === '/admin/chats';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center min-w-0 px-3 py-2 rounded-lg text-sm transition relative ${
                    pathname === item.href
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="truncate min-w-0">{item.label}</span>
                  {isChats && unreadChatsCount > 0 && (
                    <span className="ml-2 shrink-0 inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => {
              // Можно идти через /logout, где уже чистятся куки
              router.replace('/logout');
            }}
            className="mt-6 px-3 py-2 w-full rounded-lg bg-slate-200 text-sm text-slate-700 hover:bg-slate-300 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            Выйти
          </button>
        </aside>

        {/* Контент: min-w-0 и overflow-x-hidden — превью фото не растягивают страницу */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-6 pl-14 pt-14 md:pl-6 md:pt-6 md:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
