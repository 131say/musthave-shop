"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, onCartChanged, readCart, clearCart } from "@/lib/cart";

export default function UserBar() {
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const updateCount = () => {
      setCartItemsCount(cartCount());
    };
    updateCount();
    return onCartChanged(updateCount);
  }, []);

  // Загрузка количества товаров в избранном
  const updateFavoritesCount = async () => {
    if (!authed) {
      setFavoritesCount(0);
      return;
    }
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok && Array.isArray(data.products)) {
        setFavoritesCount(data.products.length);
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  };

  useEffect(() => {
    updateFavoritesCount();
    
    // Обновляем счетчик при возврате на страницу
    const handleFocus = () => {
      updateFavoritesCount();
    };
    window.addEventListener("focus", handleFocus);
    
    // Обновляем счетчик при изменении избранного (через событие)
    const handleWishlistChange = () => {
      updateFavoritesCount();
    };
    window.addEventListener("wishlist:changed", handleWishlistChange);
    
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("wishlist:changed", handleWishlistChange);
    };
  }, [authed]);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!ok) return;
        const isAuthed = Boolean(data?.authed);
        setAuthed(isAuthed);

        // Проверяем соответствие userId при загрузке страницы
        if (isAuthed && data?.user?.id) {
          const currentUserId = String(data.user.id);
          const lastUserId = localStorage.getItem("musthave_lastUserId");
          
          // Если userId изменился, очищаем корзину
          if (lastUserId && lastUserId !== currentUserId) {
            clearCart();
          }
          
          // Сохраняем текущий userId
          localStorage.setItem("musthave_lastUserId", currentUserId);
        } else if (!isAuthed) {
          // Если пользователь не авторизован, очищаем сохраненный userId
          localStorage.removeItem("musthave_lastUserId");
        }
      } catch {
        if (!ok) return;
        setAuthed(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    // Очищаем корзину при выходе
    clearCart();
    // Очищаем сохраненный userId
    localStorage.removeItem("musthave_lastUserId");
    location.href = "/login";
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Link className="rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" href="/catalog">
        Каталог
      </Link>
      <Link className="relative rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" href="/cart">
        Корзина
        {cartItemsCount > 0 && (
          <span className="ml-1.5 sm:ml-2 inline-flex min-w-[18px] sm:min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-semibold text-white">
            {cartItemsCount}
          </span>
        )}
      </Link>
      <Link className="relative rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" href={authed ? "/favorites" : "/login?next=/favorites"}>
        Избранное
        {authed && favoritesCount > 0 && (
          <span className="ml-1.5 sm:ml-2 inline-flex min-w-[18px] sm:min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-semibold text-white">
            {favoritesCount}
          </span>
        )}
      </Link>
      <Link className="rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" href="/account">
        Кабинет
      </Link>

      {authed ? (
        <button className="rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" onClick={logout}>
          Выйти
        </button>
      ) : (
        <Link className="rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800" href="/login">
          Войти
        </Link>
      )}
    </div>
  );
}
