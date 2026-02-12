"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const REF_STORAGE_KEY = "musthave_referral_ref";

/**
 * Баннер, показывающий, что реферальное приглашение активировано.
 * Не показывается, если пользователь уже авторизован и уже привязан к инвайтеру (referredByUserId).
 */
export default function ReferralBanner() {
  const searchParams = useSearchParams();
  const [showBanner, setShowBanner] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refFromUrl = searchParams.get("ref");
    const refFromStorage = localStorage.getItem(REF_STORAGE_KEY);
    const ref = refFromUrl || refFromStorage;

    if (!ref || !ref.trim()) {
      setShowBanner(false);
      setAuthChecked(true);
      return;
    }

    setRefCode(ref.trim());

    // Проверяем: авторизован ли пользователь и есть ли уже инвайтер
    fetch("/api/profile", { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) {
          setShowBanner(true);
        } else if (res.ok) {
          return res.json();
        } else {
          setShowBanner(true);
        }
      })
      .then((data) => {
        if (data?.profile?.referredByUserId != null) {
          setShowBanner(false);
        } else if (data?.profile) {
          // Авторизован, но инвайтера нет — баннер не показываем (код действует только при регистрации)
          setShowBanner(false);
        }
      })
      .catch(() => setShowBanner(true))
      .finally(() => setAuthChecked(true));
  }, [searchParams]);

  if (!authChecked || !showBanner || !refCode) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
      <div className="flex items-start gap-3">
        <span className="text-xl">✅</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Приглашение применено
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            Бонусы будут начисляться автоматически после входа.
          </p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/login?next=${encodeURIComponent("/catalog")}`}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          Войти
        </Link>
        <button
          onClick={() => setShowBanner(false)}
          className="flex-1 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-300 dark:hover:bg-neutral-800"
        >
          Продолжить покупки
        </button>
      </div>
    </div>
  );
}
