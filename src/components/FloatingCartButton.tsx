"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cartCount, onCartChanged } from "@/lib/cart";

export default function FloatingCartButton() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  
  // Скрываем на чекауте, избранном и кабинете
  const isCheckoutPage = pathname?.startsWith("/checkout");
  const isFavoritesPage = pathname === "/favorites";
  const isAccountPage = pathname === "/account";

  useEffect(() => {
    const updateCount = () => {
      setCartItemsCount(cartCount());
    };
    updateCount();
    return onCartChanged(updateCount);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Показываем кнопку, если прокрутили больше 300px вниз
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible || isCheckoutPage || isFavoritesPage || isAccountPage) return null;

  return (
    <Link
      href="/cart"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-1.5 sm:gap-2 rounded-full bg-amber-600 px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base text-white shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 active:scale-95"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-4 w-4 sm:h-5 sm:w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      <span className="font-medium hidden sm:inline">Корзина</span>
      {cartItemsCount > 0 && (
        <span className="inline-flex min-w-[20px] sm:min-w-[24px] items-center justify-center rounded-full bg-white px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-600">
          {cartItemsCount}
        </span>
      )}
    </Link>
  );
}


