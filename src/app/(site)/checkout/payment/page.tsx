"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isNewUser = searchParams.get("isNewUser") === "1";

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Номер заказа не указан");
      setLoading(false);
      return;
    }

    // Пытаемся загрузить информацию о заказе (если пользователь авторизован)
    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/orders`);
        const data = await res.json();
        if (data?.ok && data?.orders?.length > 0) {
          const foundOrder = data.orders.find((o: any) => String(o.id) === String(orderId));
          if (foundOrder) {
            setOrder(foundOrder);
          }
        }
        // Если не удалось загрузить - это нормально для гостевого чекаута
        // Просто показываем страницу с номером заказа
      } catch (e) {
        // Игнорируем ошибки - для гостевого чекаута это нормально
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">Загрузка...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
          <h1 className="text-2xl font-semibold text-red-700 dark:text-red-200">Ошибка</h1>
          <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
          <Link
            href="/catalog"
            className="mt-4 inline-block rounded-xl bg-black px-6 py-3 text-white"
          >
            Вернуться в каталог
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-2xl border bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg
              className="h-8 w-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-semibold dark:text-white">Ожидаем оплату</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Заказ №{orderId} принят и ожидает оплату
          </p>

          {order && (
            <div className="mt-8 rounded-xl border bg-gray-50 p-6 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Сумма заказа:</span>
                  <span className="font-semibold dark:text-white">
                    {order.totalAmount?.toLocaleString("ru-RU")} ₸
                  </span>
                </div>
                {order.bonusSpent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Оплачено бонусами:</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{order.bonusSpent?.toLocaleString("ru-RU")} ₸
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-3 dark:border-neutral-700">
                  <span className="font-medium dark:text-white">К оплате:</span>
                  <span className="text-xl font-semibold dark:text-white">
                    {order.cashPaid?.toLocaleString("ru-RU")} ₸
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4 text-left">
            <div className="rounded-xl border p-4 dark:border-neutral-800">
              <h2 className="mb-3 font-semibold dark:text-white">💳 Оплата через Kaspi</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Мы отправили вам счёт в приложении Kaspi
              </p>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                После оплаты:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li>• подтвердим заказ</li>
                <li>• свяжемся с вами для доставки</li>
              </ul>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Если вы уже оплатили — ничего делать не нужно. Страница может быть закрыта — мы всё равно увидим оплату.
              </p>
            </div>

            {isNewUser && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/30">
                <p className="text-sm text-green-700 dark:text-green-300">
                  🎁 Мы создали для вас аккаунт в клубе. После оплаты вы сможете войти по номеру телефона.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => router.push(`/checkout/success?orderId=${orderId}`)}
                className="w-full rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800 sm:w-auto"
              >
                Я уже оплатил(а)
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Обычно подтверждение занимает несколько минут
              </p>
            </div>
            <Link
              href="/catalog"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-center text-gray-600 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-400 dark:hover:bg-neutral-800 sm:w-auto"
            >
              Продолжить покупки
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
