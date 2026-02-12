"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clearCart, addToCart } from "@/lib/cart";

type Order = any;

function fmtDate(v: string) {
  try {
    return new Date(v).toLocaleString("ru-RU");
  } catch {
    return v;
  }
}

function statusRu(s: string) {
  const m: Record<string, string> = {
    NEW: "Принят",
    PROCESSING: "В работе",
    PAID: "Оплачен",
    SHIPPED: "Отправлен",
    DONE: "Выполнен",
    CANCELLED: "Отменён",
  };
  return m[s] ?? s;
}

function formatDeliveryTime(deliveryTime: string): string {
  try {
    const date = new Date(deliveryTime);
    if (isNaN(date.getTime())) return deliveryTime;
    
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day} ${month} в ${hours}:${minutes}`;
  } catch {
    return deliveryTime;
  }
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = useMemo(() => {
    const idStr = params?.id;
    if (!idStr || typeof idStr !== "string") return null;
    const num = Number(idStr);
    return Number.isFinite(num) ? String(num) : null;
  }, [params?.id]);
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setErr("Некорректный ID заказа");
      setLoading(false);
      return;
    }
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить заказ");
        if (!ok) return;
        setOrder(data.order);
      } catch (e: any) {
        if (!ok) return;
        setErr(String(e?.message || e));
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [id]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold dark:text-white">Заказ #{id || "—"}</h1>
        <Link href="/account" className="rounded-full border px-4 py-2 dark:border-neutral-800 dark:text-white">
          ← В кабинет
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-600 dark:text-gray-300">Загрузка...</div>
      ) : err ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      ) : !order ? null : (
        <>
          <section className="mt-6 rounded-2xl border p-6 dark:border-neutral-800">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div><span className="text-gray-500">Дата:</span> {fmtDate(order.createdAt)}</div>
                <div><span className="text-gray-500">Статус:</span> {statusRu(order.status)}</div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div><span className="text-gray-500">Сумма:</span> {order.totalAmount} ₸</div>
                {order.bonusSpent ? <div><span className="text-gray-500">Списано бонусов:</span> {order.bonusSpent} ₸</div> : null}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <div><span className="text-gray-500">Имя:</span> {order.customerName || "—"}</div>
              <div><span className="text-gray-500">Телефон:</span> {order.customerPhone || "—"}</div>
              <div><span className="text-gray-500">Адрес:</span> {order.customerAddress || "—"}</div>
              {order.deliveryTime ? <div><span className="text-gray-500">Дата и время доставки:</span> <span className="font-medium">{formatDeliveryTime(order.deliveryTime)}</span></div> : null}
              {order.comment ? <div><span className="text-gray-500">Комментарий:</span> {order.comment}</div> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    clearCart();
                    (order.items ?? []).forEach((it: any) => {
                      const productId = it.productId ?? it.product?.id;
                      if (!productId) return;
                      addToCart({
                        id: productId,
                        name: it.product?.name ?? "Товар",
                        price: it.priceAtMoment ?? it.price ?? 0,
                        qty: it.quantity ?? 1,
                        imageUrl: it.product?.imageUrl ?? null,
                        brandName: it.product?.brand?.name ?? null,
                        slug: it.product?.slug ?? null,
                      });
                    });
                  } catch (e) {
                    console.error("Ошибка при повторении заказа:", e);
                  }
                  router.push("/cart");
                }}
                className="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                Повторить заказ
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border p-6 dark:border-neutral-800">
            <h2 className="text-lg font-semibold dark:text-white">Товары</h2>
            <div className="mt-4 space-y-3">
              {(order.items ?? []).map((it: any) => {
                const productId = it.productId ?? it.product?.id;
                const productSlug = it.product?.slug;
                const productUrl = productSlug && productId
                  ? `/product/${encodeURIComponent(String(productSlug))}-${productId}`
                  : productId
                  ? `/product/${productId}`
                  : null;
                
                return (
                  <div key={it.id} className="flex items-start justify-between rounded-xl border p-4 dark:border-neutral-800">
                    <div className="flex-1">
                      {productUrl ? (
                        <Link
                          href={productUrl}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {it.product?.name ?? "Товар"}
                        </Link>
                      ) : (
                        <div className="font-medium dark:text-white">{it.product?.name ?? "Товар"}</div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {it.quantity} × {it.priceAtMoment} ₸
                      </div>
                    </div>
                    <div className="font-semibold dark:text-white">{it.subtotal} ₸</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

