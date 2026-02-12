"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);

  const completeOnboarding = async () => {
    setCompleting(true);
    try {
      await fetch("/api/profile/onboarding-complete", { method: "POST" });
      router.push("/catalog");
      router.refresh();
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
      // Всё равно перенаправляем
      router.push("/catalog");
    }
  };

  useEffect(() => {
    // Загружаем данные пользователя
    const loadData = async () => {
      try {
        const profileRes = await fetch("/api/profile");
        const profileData = await profileRes.json();
        if (profileData?.profile) {
          setReferralCode(profileData.profile.referralCode || null);
          
          // Загружаем баланс бонусов отдельно
          try {
            const meRes = await fetch("/api/auth/me");
            const meData = await meRes.json();
            if (meData?.user?.id) {
              const bonusRes = await fetch(`/api/profile/bonus-events?userId=${meData.user.id}`);
              const bonusData = await bonusRes.json();
              if (bonusData?.ok && typeof bonusData.balance === 'number') {
                setBonusBalance(bonusData.balance);
              }
            }
          } catch (e) {
            // Игнорируем ошибки загрузки баланса
          }
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      }
    };
    loadData();
  }, []);

  const copyReferralLink = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/catalog?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Экран №1 — приветствие
  if (step === 1) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <span className="text-3xl">👋</span>
            </div>

            <h1 className="text-3xl font-semibold dark:text-white">Добро пожаловать</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Вы теперь участник клуба.
            </p>

            {bonusBalance !== null && bonusBalance > 0 && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/30">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  🎁 Вам начислен кэшбэк: {bonusBalance.toLocaleString("ru-RU")} ₸
                </p>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <button
                onClick={() => setStep(2)}
                className="w-full rounded-xl bg-black px-8 py-3 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Продолжить
              </button>
              <button
                onClick={completeOnboarding}
                className="w-full text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Пропустить
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Экран №2 — "Как здесь зарабатывают"
  if (step === 2) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-center">
            <h1 className="text-2xl font-semibold dark:text-white">Как здесь всё работает</h1>

            <div className="mt-8 space-y-6 text-left">
              <div className="flex items-start gap-4 rounded-xl border p-4 dark:border-neutral-800">
                <span className="text-2xl">🛒</span>
                <div>
                  <h3 className="font-medium dark:text-white">Вы покупаете — получаете кэшбэк</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    С каждой покупки вам начисляется кэшбэк
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border p-4 dark:border-neutral-800">
                <span className="text-2xl">🔗</span>
                <div>
                  <h3 className="font-medium dark:text-white">Делитесь своей ссылкой с друзьями</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Скопируйте вашу реферальную ссылку и отправьте друзьям
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border p-4 dark:border-neutral-800">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="font-medium dark:text-white">Получаете бонусы за их покупки (2 уровня)</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Когда ваши друзья покупают, вы получаете бонусы. Также бонусы начисляются за покупки друзей ваших друзей
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-xl border px-6 py-3 text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
                >
                  Назад
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  Продолжить
                </button>
              </div>
              <button
                onClick={completeOnboarding}
                className="w-full text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Пропустить
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Экран №3 — реферальная ссылка
  if (step === 3) {
    const referralLink = referralCode
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/catalog?ref=${referralCode}`
      : "";

    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-center">
            <h1 className="text-2xl font-semibold dark:text-white">Ваша ссылка для приглашений</h1>

            <div className="mt-8 rounded-xl border bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  onClick={copyReferralLink}
                  className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {copied ? "Скопировано!" : "Скопировать"}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Делитесь только с теми, кому реально советуете.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={completeOnboarding}
                disabled={completing}
                className="w-full rounded-xl bg-black px-8 py-4 text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {completing ? "Сохраняю..." : "Перейти к покупкам"}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
