"use client";

import { useState, useEffect } from "react";
import { addToCart } from "@/lib/cart";

export default function StickyBuyButton({
  item,
}: {
  item: { id: number; slug: string; name: string; brandName?: string | null; price: number; oldPrice?: number | null; imageUrl?: string | null };
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Показываем кнопку, если прокрутили больше 300px вниз
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  const handleClick = () => {
    addToCart({
      id: Number(item.id),
      slug: String(item.slug),
      name: String(item.name),
      brandName: item.brandName ?? null,
      price: Number(item.price || 0),
      oldPrice: item.oldPrice ? Number(item.oldPrice) : null,
      imageUrl: item.imageUrl ?? null,
      qty: 1,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 900);
  };

  const priceFormatted = item.price.toLocaleString("ru-RU");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-full border-t border-gray-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
      <div className="mx-auto w-full max-w-full px-4 py-3">
        <button
          onClick={handleClick}
          className="w-full rounded-xl bg-black px-5 py-3 text-base font-medium text-white hover:bg-gray-800 active:scale-95 transition-all duration-150"
        >
          {justAdded ? "Добавлено ✓" : `Купить сейчас · ${priceFormatted} ₸`}
        </button>
      </div>
    </div>
  );
}
