"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  priceAtMoment: number;
  subtotal: number;
  product?: {
    id: number;
    name: string;
    slug?: string | null;
    imageUrl?: string | null;
  } | null;
};

type Order = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  comment: string | null;
  deliveryTime: string | null;
  status: string;
  totalAmount: number;
  bonusSpent: number;
  cashPaid: number;
  createdAt: string;
  items: OrderItem[];
};

function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₸`;
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusRu(s: string) {
  const m: Record<string, string> = {
    NEW: "Ожидает оплаты",
    PROCESSING: "В обработке",
    PAID: "Оплачен",
    SHIPPED: "Отправлен",
    DONE: "Доставлен",
    CANCELLED: "Отменён",
  };
  return m[s] ?? s;
}

function statusBadgeClass(s: string) {
  const m: Record<string, string> = {
    NEW: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200",
    PROCESSING: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
    PAID: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-200",
    SHIPPED: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200",
    DONE: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    CANCELLED: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200",
  };
  return m[s] ?? "border-gray-200 bg-gray-50 text-gray-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-200";
}

function statusIcon(s: string) {
  const m: Record<string, string> = {
    NEW: "🕒",
    PROCESSING: "📦",
    PAID: "💳",
    SHIPPED: "🚚",
    DONE: "✅",
    CANCELLED: "❌",
  };
  return m[s] ?? "📋";
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Номер заказа не указан");
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!active) return;

        if (res.status === 404) {
          setError("not_found");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError("Ошибка загрузки заказа");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data?.ok && data?.order) {
          setOrder(data.order);
        } else {
          setError("Ошибка загрузки заказа");
        }
      } catch (e) {
        if (active) {
          setError("Ошибка загрузки заказа");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8 pb-28 sm:px-6">
        <div className="rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <div className="flex items-center justify-center gap-3 py-12">
            <svg className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Загружаем заказ…</span>
          </div>
        </div>
      </main>
    );
  }

  if (error === "not_found" || !order) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8 pb-28 sm:px-6">
        <div className="rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold dark:text-white mb-4">Заказ не найден</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Заказ с указанным номером не существует или недоступен.
            </p>
            <Link
              href="/account?tab=orders"
              className="inline-block rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Вернуться в кабинет
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8 pb-28 sm:px-6">
        <div className="rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold dark:text-white mb-4">Ошибка</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">{error}</p>
            <Link
              href="/account?tab=orders"
              className="inline-block rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Вернуться в кабинет
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 pb-28 sm:px-6">
      {/* Маркер для проверки роута — после проверки удалите строку ниже */}
      <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">MOBILE_FIX_V1</p>

      {/* Назад к заказам — компактно */}
      <div className="mb-4">
        <Link
          href="/account?tab=orders"
          className="inline-flex items-center gap-2 text-base text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к заказам
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
        {/* Шапка заказа — мобильные размеры */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-semibold dark:text-white sm:text-4xl">Заказ №{order.id}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Дата: {fmtDate(order.createdAt)}
          </p>
        </div>

        {/* Статус — компактные отступы */}
        <div className="mb-4 rounded-xl border p-4 dark:border-neutral-800 sm:mb-6 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl">{statusIcon(order.status)}</span>
            <div className="min-w-0 flex-1">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium sm:px-4 sm:py-2",
                  statusBadgeClass(order.status),
                ].join(" ")}
              >
                {statusRu(order.status)}
              </span>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Мы напишем вам в WhatsApp, если понадобится уточнение
              </p>
            </div>
          </div>
        </div>

        {/* Состав заказа — карточки компактные, мобильные отступы */}
        <div className="mb-4 sm:mb-6">
          <h2 className="mb-3 text-lg font-semibold dark:text-white sm:mb-4 sm:text-xl">Состав заказа</h2>
          <div className="space-y-3 sm:space-y-4">
            {order.items.map((item) => {
              const productUrl = item.product?.slug
                ? `/product/${encodeURIComponent(String(item.product.slug))}-${item.product.id}`
                : `/product/${item.productId}`;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border p-3 dark:border-neutral-800 sm:gap-4 sm:p-4"
                >
                  {item.product?.imageUrl && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-neutral-800">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug dark:text-white sm:text-base">
                      {item.product ? (
                        <Link
                          href={productUrl}
                          className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {item.product.name}
                        </Link>
                      ) : (
                        `Товар #${item.productId}`
                      )}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                      <span className="whitespace-nowrap">{fmtMoney(item.priceAtMoment)}</span> × {item.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="whitespace-nowrap text-sm font-bold dark:text-white sm:text-base">{fmtMoney(item.subtotal)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Итого — flex items-end, сумма мобильная */}
        <div className="mb-4 border-t pt-4 dark:border-neutral-800 sm:mb-6 sm:pt-6">
          <div className="flex items-end justify-between gap-2">
            <span className="text-xl font-semibold dark:text-white sm:text-2xl">Итого</span>
            <span className="whitespace-nowrap text-3xl font-bold dark:text-white sm:text-5xl">{fmtMoney(order.totalAmount)}</span>
          </div>
          {order.bonusSpent > 0 && (
            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Оплачено бонусами:</span>
              <span className="whitespace-nowrap">-{fmtMoney(order.bonusSpent)}</span>
            </div>
          )}
        </div>

        {/* Доставка — p-4 на мобилке, компактные строки */}
        <div className="mb-4 rounded-xl border p-4 dark:border-neutral-800 sm:mb-6 sm:p-6">
          <h2 className="mb-3 text-xl font-semibold dark:text-white sm:mb-4 sm:text-2xl">Доставка</h2>
          <div className="space-y-2 text-sm sm:space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Имя: </span>
              <span className="break-words text-gray-900 dark:text-white">{order.customerName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Телефон: </span>
              <span className="break-words text-gray-900 dark:text-white">{order.customerPhone}</span>
            </div>
            {order.customerAddress && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Адрес: </span>
                <span className="break-words text-gray-900 dark:text-white">{order.customerAddress}</span>
              </div>
            )}
            {order.deliveryTime && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Время доставки: </span>
                <span className="break-words text-gray-900 dark:text-white">{order.deliveryTime}</span>
              </div>
            )}
            {order.comment && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Комментарий: </span>
                <span className="break-words text-gray-900 dark:text-white">{order.comment}</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA кнопки — не упираются в низ благодаря pb-28 на main */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2">
            <button
              disabled
              className="rounded-xl border border-gray-300 bg-gray-100 px-4 py-2.5 text-gray-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-500 sm:px-6 sm:py-3"
            >
              Повторить заказ
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Скоро будет доступно
            </p>
          </div>
          <Link
            href="/catalog"
            className="rounded-xl bg-black px-4 py-2.5 text-center text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 sm:px-6 sm:py-3"
          >
            Перейти к покупкам
          </Link>
        </div>
      </div>
    </main>
  );
}
