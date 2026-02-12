// src/components/cart/CartBadge.tsx
'use client';

import { useCart } from './CartProvider';

export const CartBadge = () => {
  const { totalQuantity } = useCart();

  if (totalQuantity === 0) {
    return (
      <span className="text-[11px] text-slate-400">
        0
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-2 text-[11px] font-semibold text-white">
      {totalQuantity}
    </span>
  );
};







