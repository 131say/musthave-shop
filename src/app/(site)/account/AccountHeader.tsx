"use client";

import Link from "next/link";

export default function AccountHeader() {
  return (
    <header className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <Link 
        href="/catalog" 
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Назад
      </Link>
      <h1 className="text-xl font-semibold tracking-tight dark:text-white">Мой кабинет</h1>
      <div className="w-16"></div> {/* Spacer для центрирования */}
    </header>
  );
}
