'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const menu = [
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/products', label: 'Товары' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/stats', label: 'Аналитика' },
  { href: '/admin/referrals', label: 'Рефералы' },
  { href: '/admin/requests', label: 'Запросы' },
  { href: '/admin/news', label: 'Новости' },
  { href: '/admin/settings', label: 'Настройки' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // если пользователь "не админ" — выкидываем на / (логин)
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN') {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-slate-50">
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
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-slate-200 md:hidden"
        aria-label="Открыть меню"
      >
        <svg
          className="w-6 h-6 text-slate-700"
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
        className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 p-4 z-40 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="text-xl font-semibold">MustHave Admin</div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-slate-100"
            aria-label="Закрыть меню"
          >
            <svg
              className="w-6 h-6 text-slate-700"
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
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm transition 
                ${pathname === item.href
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => {
            localStorage.removeItem('role');
            router.replace('/logout');
          }}
          className="mt-6 px-3 py-2 w-full rounded-lg bg-slate-200 text-sm text-slate-700 hover:bg-slate-300"
        >
          Выйти
        </button>
      </aside>

      {/* Контент */}
      <main className="flex-1 p-6 md:ml-0">{children}</main>
    </div>
  );
}







