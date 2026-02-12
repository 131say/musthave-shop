"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartItem, readCart, removeFromCart, setQty, clearCart } from "@/lib/cart";
import { getThumbImage } from "@/lib/imageUtils";

function fmt(n: number) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function getProductUrl(item: CartItem): string {
  if (item.slug) {
    // Формат как в каталоге: slug-id
    return `/product/${encodeURIComponent(String(item.slug))}-${item.id}`;
  }
  // Fallback на id, если нет slug
  return `/product/${item.id}`;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = () => setItems(readCart());

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== "musthave_cart_v1") return;
      refresh();
    };
    const on = () => refresh();
    window.addEventListener("cart:changed", on);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart:changed", on);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
    const count = items.reduce((s, it) => s + (it.qty || 0), 0);
    return { subtotal, count };
  }, [items]);

  return (
    <main className="mx-auto w-full max-w-full px-4 py-8 pb-24 lg:pb-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold dark:text-white">Корзина</h1>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{totals.count ? `Товаров: ${totals.count}` : "Пока пусто"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800" href="/catalog">
              ← В каталог
            </Link>
            {!!items.length && (
              <button
                className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-500 dark:hover:bg-neutral-800"
                onClick={() => {
                  if (confirm("Очистить корзину?")) {
                    clearCart();
                    refresh();
                  }
                }}
                title="Очистить корзину"
              >
                ⋯
              </button>
            )}
          </div>
        </div>
        {!!items.length && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/40 dark:bg-green-950/30">
            <span className="text-sm">🟢</span>
            <p className="text-sm text-green-800 dark:text-green-200">
              Оформление займёт 1–2 минуты
            </p>
          </div>
        )}
      </div>

      {!items.length ? (
        <div className="rounded-2xl border bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-gray-700 dark:text-gray-300">Добавь товары из каталога, и они появятся здесь.</div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <div className="divide-y dark:divide-neutral-700">
                {items.map((it) => (
                  <div key={it.id} className="flex gap-4 p-4">
                    <Link
                      href={getProductUrl(it)}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 hover:opacity-80 transition-opacity"
                    >
                      {it.imageUrl ? (
                        <img
                          src={getThumbImage(it.imageUrl)!}
                          alt={it.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center px-1">Фото</p>
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={getProductUrl(it)}
                          className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity overflow-hidden"
                        >
                          {it.brandName ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{it.brandName}</div>
                          ) : null}
                          <div className="font-medium dark:text-white break-words line-clamp-2">{it.name}</div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{fmt(it.price)} ₸</div>
                        </Link>
                        <button
                          className="rounded-lg border p-2 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                          onClick={(e) => {
                            e.preventDefault();
                            removeFromCart(it.id);
                            refresh();
                          }}
                          title="Удалить из корзины"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="h-4 w-4"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="h-9 w-9 rounded-lg border text-lg hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                            onClick={() => {
                              const next = Math.max(1, (it.qty || 1) - 1);
                              setQty(it.id, next);
                              refresh();
                            }}
                          >
                            –
                          </button>
                          <input
                            className="h-9 w-16 rounded-lg border px-2 text-center text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                            value={String(it.qty || 1)}
                            inputMode="numeric"
                            onChange={(e) => {
                              const v = Number(String(e.target.value).replace(/[^\d]/g, ""));
                              if (!Number.isFinite(v) || v <= 0) return;
                              setQty(it.id, v);
                              refresh();
                            }}
                          />
                          <button
                            className="h-9 w-9 rounded-lg border text-lg hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                            onClick={() => {
                              setQty(it.id, (it.qty || 1) + 1);
                              refresh();
                            }}
                          >
                            +
                          </button>
                        </div>
                        <div className="sm:ml-auto text-sm text-gray-700 dark:text-gray-300">
                          Сумма: <span className="font-medium">{fmt((it.price || 0) * (it.qty || 0))} ₸</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Блок поддержки для мобильных (над sticky-кнопкой, в основном контенте) */}
            <div className="lg:hidden mt-4 space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900/40 dark:bg-green-950/30">
              <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                <span>✓</span>
                <span>Без регистрации</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                <span>✓</span>
                <span>Оплата через Kaspi</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                <span>✓</span>
                <span>Мы напишем вам после заказа</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Стоимость доставки мы уточним после оформления заказа
              </div>
            </div>
          </div>

          {/* Sticky блок для десктопа */}
          <div className="hidden lg:block">
            <div className="sticky top-4 rounded-2xl border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="text-sm text-gray-600 dark:text-gray-400">Итого</div>
              <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(totals.subtotal)} ₸</div>
              <div className="mt-4 flex flex-col gap-3">
                <Link className="rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200" href="/checkout">
                  Перейти к оформлению →
                </Link>
                
                {/* Блок поддержки */}
                <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900/40 dark:bg-green-950/30">
                  <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                    <span>✓</span>
                    <span>Без регистрации</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                    <span>✓</span>
                    <span>Оплата через Kaspi</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                    <span>✓</span>
                    <span>Мы напишем вам после заказа</span>
                  </div>
                </div>

                {/* Текст про доставку */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Стоимость доставки мы уточним после оформления заказа</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sticky блок для мобильных (фиксированный внизу) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 w-full max-w-full border-t border-gray-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto w-full max-w-full px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Итого</div>
                  <div className="text-xl font-semibold dark:text-white">{fmt(totals.subtotal)} ₸</div>
                </div>
              </div>
              <Link className="block w-full rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200" href="/checkout">
                Перейти к оформлению →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

