// src/components/ProductGrid.tsx
'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { getCardImage } from '@/lib/imageUtils';

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
};

export function ProductGrid({ products }: { products: Product[] }) {
  const { addItem } = useCart();

  return (
    <>
      {products.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Товары ещё не добавлены. Как только они появятся, здесь будет каталог.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const href = `/product/${encodeURIComponent(String(product.slug))}-${product.id}`;
            const imgSrc = getCardImage(product.imageUrl) || "/images/placeholder.svg";
            
            return (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 p-3 shadow-sm shadow-neutral-100 transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-neutral-950"
              >
                <Link href={href} className="block">
                  <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    {product.imageUrl ? (
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-neutral-400 dark:text-neutral-500">
                        фото товара
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="line-clamp-2 text-sm font-medium leading-snug text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-gray-400">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {product.price.toLocaleString('ru-RU')} ₸
                      </div>
                      {product.oldPrice && (
                        <div className="text-[11px] text-slate-400 dark:text-gray-500 line-through">
                          {product.oldPrice.toLocaleString('ru-RU')} ₸
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        imageUrl: product.imageUrl,
                      });
                    }}
                    className="w-full rounded-full bg-amber-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm shadow-amber-200 transition group-hover:bg-amber-700 dark:bg-amber-600 dark:shadow-neutral-900 dark:hover:bg-amber-700 active:scale-95"
                  >
                    В корзину
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}






