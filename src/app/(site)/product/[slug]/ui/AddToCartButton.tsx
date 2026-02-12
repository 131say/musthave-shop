"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

export default function AddToCartButton({
  item,
}: {
  item: { id: number; slug: string; name: string; brandName?: string | null; price: number; oldPrice?: number | null; imageUrl?: string | null };
}) {
  const [justAdded, setJustAdded] = useState(false);

  return (
    <button
      className="w-full rounded-xl bg-black px-5 py-3 text-base font-medium text-white hover:bg-gray-800 active:scale-95 transition-all duration-150"
      onClick={() => {
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
      }}
    >
      {justAdded ? "Добавлено ✓" : "Купить сейчас"}
    </button>
  );
}

