"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addToCart } from "@/lib/cart";
import { getCardImage } from "@/lib/imageUtils";
import FavoritesHeader from "./FavoritesHeader";

function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₸`;
}

export default function FavoritesPage() {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Проверка авторизации
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (active) {
          const isAuthed = Boolean(data?.authed);
          setAuthed(isAuthed);
          if (!isAuthed) {
            setWishlist([]);
          }
        }
      } catch (e) {
        if (active) setAuthed(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Загрузка избранного
  useEffect(() => {
    let active = true;
    (async () => {
      if (!authed) {
        if (active) setWishlist([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить избранное");
        if (active) setWishlist(data.products || []);
      } catch (e) {
        if (active) setError(String((e as any)?.message || e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authed]);

  // Обновление при изменении избранного
  useEffect(() => {
    const handleWishlistChange = () => {
      if (authed) {
        fetch("/api/wishlist", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (data?.ok && Array.isArray(data.products)) {
              setWishlist(data.products);
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("wishlist:changed", handleWishlistChange);
    return () => {
      window.removeEventListener("wishlist:changed", handleWishlistChange);
    };
  }, [authed]);

  if (authed === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600 dark:text-gray-400">Войдите в систему, чтобы просматривать избранное</p>
        <Link
          href="/login?next=/favorites"
          className="rounded-xl bg-black px-6 py-3 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div>
      <FavoritesHeader />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Товары, которые вам понравились</p>

      {loading ? (
        <div className="mt-8 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">Загрузка избранного...</p>
        </div>
      ) : error ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          Ошибка: {error}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-4 rounded-2xl border p-12 dark:border-neutral-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-16 w-16 text-gray-400 dark:text-gray-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <p className="text-lg text-gray-600 dark:text-gray-400">Ваше избранное пусто</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Добавьте товары, которые вам нравятся!</p>
          <Link
            href="/catalog"
            className="mt-4 rounded-xl bg-black px-6 py-3 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((product: any) => {
              const imgSrc = getCardImage(product.imageUrl) || "/images/placeholder.svg";
              // Используем формат slug-id для правильного поиска товара
              const productUrl = product.slug && product.id
                ? `/product/${encodeURIComponent(String(product.slug))}-${product.id}`
                : product.id
                ? `/product/${product.id}`
                : product.slug
                ? `/product/${encodeURIComponent(String(product.slug))}`
                : "#";
              
              return (
                <div key={product.id} className="rounded-2xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <Link href={productUrl}>
                    {product.imageUrl ? (
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="h-48 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-xl bg-gray-50 dark:bg-neutral-800">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Фото</p>
                      </div>
                    )}
                  </Link>
                  <div className="mt-3">
                    {product.brand && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{product.brand.name}</div>
                    )}
                    <Link href={productUrl}>
                      <h3 className="mt-1 font-semibold dark:text-white hover:text-rose-600 dark:hover:text-rose-400 line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="mt-2 flex items-baseline gap-2">
                      <div className="text-lg font-semibold dark:text-white">{fmtMoney(product.price)} ₸</div>
                      {product.oldPrice && product.oldPrice > product.price && (
                        <>
                          <div className="text-sm text-gray-400 dark:text-gray-500 line-through">
                            {fmtMoney(product.oldPrice)} ₸
                          </div>
                          {(() => {
                            const discountPercent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
                            return discountPercent > 0 ? (
                              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                −{discountPercent}%
                              </span>
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={async () => {
                        addToCart({
                          id: product.id,
                          slug: product.slug,
                          name: product.name,
                          brandName: product.brand?.name ?? null,
                          price: product.price,
                          oldPrice: product.oldPrice || null,
                          imageUrl: product.imageUrl || null,
                          qty: 1,
                        });
                        alert("Товар добавлен в корзину");
                      }}
                      className="flex-1 rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      В корзину
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/wishlist/${product.id}`, {
                            method: "DELETE",
                          });
                          const data = await res.json().catch(() => null);
                          if (res.ok && data?.ok) {
                            setWishlist(wishlist.filter((p: any) => p.id !== product.id));
                            // Уведомляем об изменении избранного
                            window.dispatchEvent(new Event("wishlist:changed"));
                          } else {
                            alert(data?.error || "Ошибка при удалении");
                          }
                        } catch (e) {
                          alert("Ошибка при удалении");
                        }
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-500 dark:hover:bg-neutral-700 dark:hover:text-gray-300"
                      title="Удалить из избранного"
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
                </div>
              );
            })}
          </div>
          
          {/* Блок "Что делать дальше" */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Добавляйте товары в избранное, чтобы не потерять их
            </p>
            <Link
              href="/catalog"
              className="inline-block rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-700"
            >
              Перейти в каталог
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

