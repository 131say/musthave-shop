"use client";

import { useEffect, useState } from "react";

type Slot = {
  slot: number;
  occupied: boolean;
  user: { id: number; phone: string } | null;
};

type Props = {
  userId: number;
};

export default function SlotsGrid({ userId }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [login, setLogin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);
  const [buyingSlot, setBuyingSlot] = useState(false);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [referralsEnabled, setReferralsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadSlots();
    loadSlotPrice();
    loadBonusBalance();
    loadReferralsEnabled();
  }, [userId]);
  
  async function loadReferralsEnabled() {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.profile) {
        setReferralsEnabled(data.profile.referralsEnabled ?? false);
      }
    } catch (e) {
      console.error("Failed to load referrals enabled status:", e);
    }
  }

  async function loadBonusBalance() {
    try {
      const res = await fetch(`/api/profile/bonus-events?userId=${encodeURIComponent(String(userId))}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.balance === "number") {
        setBonusBalance(data.balance);
      }
    } catch (e) {
      console.error("Failed to load bonus balance:", e);
    }
  }

  async function loadSlots() {
    try {
      const res = await fetch(`/api/slots/my?userId=${encodeURIComponent(String(userId))}`);
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setSlots(data.slots || []);
      }
    } catch (e) {
      console.error("Failed to load slots:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSlotPrice() {
    try {
      const res = await fetch("/api/profile/slot-price", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setSlotPrice(data.slotPrice ?? null);
      }
    } catch (e) {
      console.error("Failed to load slot price:", e);
    }
  }

  async function handleSlotClick(slot: Slot) {
    if (slot.occupied) {
      // Слот занят, можно показать информацию о пользователе
      return;
    }
    setSelectedSlot(slot.slot);
    setShowModal(true);
    setError(null);
    setLogin("");
  }

  async function handleCreateUser() {
    if (!login.trim() || !password.trim()) {
      setError("Заполните логин и пароль");
      return;
    }

    if (password.length < 4) {
      setError("Пароль должен быть не менее 4 символов");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/slots/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: login.trim(),
          password: password.trim(),
          slotIndex: selectedSlot,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Ошибка при создании пользователя");
        return;
      }

      // Обновляем список слотов
      await loadSlots();
      setShowModal(false);
      setLogin("");
      setSelectedSlot(null);
    } catch (e) {
      setError("Ошибка при создании пользователя");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBuySlot() {
    if (!slotPrice || slotPrice <= 0) {
      setError("Не удалось получить цену слота");
      return;
    }

    setBuyingSlot(true);
    setError(null);

    try {
      const res = await fetch("/api/profile/buy-slot", {
        method: "POST",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Ошибка при покупке слота");
        return;
      }

      // Обновляем список слотов, цену и баланс
      await loadSlots();
      await loadSlotPrice();
      await loadBonusBalance();
    } catch (e) {
      setError("Ошибка при покупке слота");
    } finally {
      setBuyingSlot(false);
    }
  }

  if (loading || referralsEnabled === null) {
    return (
      <div className="mt-4">
        <p className="text-gray-600 dark:text-gray-400">Загрузка слотов...</p>
      </div>
    );
  }

  // Показываем сообщение, если слотов нет
  if (!loading && slots.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-gray-600 dark:text-gray-400">Здесь появятся ваши приглашения и их статус</p>
      </div>
    );
  }

  // Для блоггеров система слотов отключена
  if (referralsEnabled === true) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        Для блоггеров система слотов отключена. Вы можете приглашать неограниченное количество пользователей через реферальную программу.
      </div>
    );
  }

  return (
    <>
      <div className="mt-4">
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {slots.map((slot) => (
            <button
              key={slot.slot}
              onClick={() => handleSlotClick(slot)}
              disabled={slot.occupied}
              className={`relative aspect-square rounded-xl border-2 transition-all ${
                slot.occupied
                  ? "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/30 cursor-default"
                  : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 cursor-pointer"
              }`}
            >
              {slot.occupied ? (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                  <span className="text-sm font-medium">#{slot.slot}</span>
                </div>
              )}
            </button>
          ))}
          
          {/* Кнопка добавления нового слота */}
          <button
            onClick={handleBuySlot}
            disabled={buyingSlot || !slotPrice}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            {buyingSlot ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6 text-gray-400 dark:text-gray-500"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {bonusBalance !== null && (
            <div>
              Доступно бонусов: <span className="font-semibold dark:text-white">{bonusBalance.toLocaleString("ru-RU")}</span>
            </div>
          )}
          {slotPrice && (
            <div>
              Цена следующего слота: <span className="font-semibold dark:text-white">{slotPrice.toLocaleString("ru-RU")} бонусов</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Модальное окно для создания пользователя */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-lg font-semibold dark:text-white">Создать пользователя в слоте #{selectedSlot}</h3>
            
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Логин (телефон):</label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-2 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                  placeholder="+7 700 123 4567"
                />
              </div>
              
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              Пользователь войдёт в аккаунт через код в WhatsApp. Пароль не требуется.
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreateUser}
                disabled={submitting}
                className="flex-1 rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {submitting ? "Создание..." : "Создать"}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                  setLogin("");
                }}
                className="rounded-xl border px-4 py-2 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

