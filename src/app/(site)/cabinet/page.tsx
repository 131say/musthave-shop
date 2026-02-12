"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CabinetPage() {
  const sp = useSearchParams();
  const orderId = sp.get("orderId");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      {orderId ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          Спасибо! Заказ №{orderId} принят. Мы свяжемся с вами.
        </div>
      ) : null}
      <div className="text-center">
        <Link 
          href="/account" 
          className="inline-block rounded-xl bg-black px-6 py-3 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Перейти в кабинет
        </Link>
      </div>
    </main>
  );
}
