"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Проверка авторизации через /api/profile (как в ТЗ)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        // 200 → авторизован, 401 → гость
        const isAuthed = res.status === 200;
        if (active) {
          setAuthed(isAuthed);
        }
      } catch (e) {
        if (active) setAuthed(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Не загружаем заказ - это нормально для гостевого чекаута
    setLoading(false);
  }, [orderId]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-2xl border bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
        {/* 1️⃣ Заголовок */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-semibold dark:text-white">Спасибо за заказ!</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Мы получили оплату и начали обработку.
          </p>
          {orderId && (
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              Заказ №{orderId}
            </p>
          )}
        </div>

        {/* 2️⃣ Блок "Что дальше" */}
        <div className="mt-8 rounded-xl border bg-gray-50 p-6 dark:border-neutral-800 dark:bg-neutral-800">
          <h2 className="mb-4 text-lg font-semibold dark:text-white">Что дальше?</h2>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <span className="text-xl">📦</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Мы подтвердим заказ и передадим его курьеру
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📲</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Статус заказа придёт вам в WhatsApp или SMS
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Если возникнут вопросы — мы всегда на связи в WhatsApp
          </p>
        </div>

        {/* 3️⃣ Разделительная пауза */}
        <div className="my-8 border-t dark:border-neutral-800"></div>

        {/* 3.5️⃣ Блок про доставку (опционально) */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-start gap-3">
            <span className="text-xl">🚚</span>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ожидаемая доставка
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                1–3 дня по Алматы • 2–5 дней по Казахстану
              </p>
            </div>
          </div>
        </div>

        {/* 4️⃣ Блок для гостей или авторизованных */}
        {authed === null ? (
          // Пока проверяем авторизацию, показываем индикатор загрузки
          <div className="mt-8">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">Проверяем статус…</span>
              </div>
            </div>
          </div>
        ) : authed ? (
          // Для авторизованных пользователей
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                    Бонусы за этот заказ будут начислены после доставки
                  </h2>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Бонусы начисляются после доставки заказа
                  </p>
                </div>
              </div>
            </div>

            {/* Текст про статус заказа */}
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Статус заказа будет доступен в кабинете
            </p>

            {/* Кнопки для авторизованных */}
            <div className="mt-8 space-y-3">
              <Link
                href="/account?tab=orders"
                className="block rounded-xl bg-black px-6 py-3 text-center text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Перейти в кабинет
              </Link>
              <div className="text-center">
                <Link
                  href="/catalog"
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Продолжить покупки
                </Link>
              </div>
            </div>
          </>
        ) : (
          // Для гостей
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/40 dark:bg-blue-950/30">
              <h2 className="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-200">
                🎁 Бонусная система для клиентов
              </h2>
              <ul className="space-y-2 text-left text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>кэшбэк с заказов</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>бонусы за приглашения</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>история покупок</span>
                </li>
              </ul>
            </div>

            {/* Кнопки для гостей */}
            <div className="mt-8 space-y-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/checkout/success${orderId ? `?orderId=${orderId}` : ''}`)}`}
                className="block rounded-xl bg-black px-6 py-3 text-center text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Войти в клуб и получить бонусы
              </Link>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Пароль не нужен. Вход по SMS.
              </p>

              <div className="text-center">
                <Link
                  href="/catalog"
                  className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  Я зайду позже
                </Link>
              </div>
            </div>

            {/* SMS-подсказка для гостей */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Вы можете войти в клуб в любой момент через кнопку «Войти» в меню.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
