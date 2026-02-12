"use client";

import Link from "next/link";

export default function CheckoutHeader() {
  return (
    <header className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <Link href="/home" className="text-lg font-semibold tracking-tight dark:text-white">
        MustHave
      </Link>
      <Link 
        href="/cart" 
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Назад в корзину
      </Link>
    </header>
  );
}
