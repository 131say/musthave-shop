"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SlotsGrid from "@/components/SlotsGrid";
import AccountHeader from "./AccountHeader";

type ApiOrderItem = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  priceAtMoment: number;
  subtotal: number;
  product?: {
    id: number;
    name: string;
  } | null;
};

type ApiOrder = {
  id: number;
  customerPhone: string;
  customerName: string | null;
  customerAddress: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: ApiOrderItem[];
};

type ApiProfile = {
  id: number;
  login: string;
  role: string;
  phone: string | null;
  referralCode?: string | null;
  bonusBalance?: number | null;
};

type ApiResponse = {
  profile: ApiProfile | null;
  orders: ApiOrder[];
  bonuses?: Array<{
    id: number;
    createdAt: string;
    type?: string | null;
    amount?: number | null;
    delta?: number | null;
    comment?: string | null;
    description?: string | null;
  }>;
  referrals?: Array<{
    id: number;
    createdAt: string;
    login?: string | null;
    phone?: string | null;
  }>;
  slots?: Array<{
    id: number;
    createdAt: string;
    status?: string | null;
    usedAt?: string | null;
  }>;
};

function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₸`;
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

function humanStatus(s: string) {
  const x = String(s || "").toUpperCase();
  if (x === "NEW") return "Новый";
  if (x === "DONE" || x === "COMPLETED") return "Выполнен";
  if (x === "CANCELLED" || x === "CANCELED") return "Отменён";
  if (x === "IN_PROGRESS" || x === "PROCESSING") return "В работе";
  return s;
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

export default function AccountPage() {
  const sp = useSearchParams();
  const [me, setMe] = useState<{ id: number; role: string; login?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [bonusEvents, setBonusEvents] = useState<any[]>([]);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusErr, setBonusErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ login: string; phone: string | null; name: string | null; address: string | null; referralCode: string | null; slotsTotal?: number; slotsUsed?: number; bonusBalance?: number; referralsEnabled?: boolean; referralActivationRequested?: boolean } | null>(null);
  const [pName, setPName] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ref, setRef] = useState<any | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refErr, setRefErr] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [invitedLoading, setInvitedLoading] = useState(false);
  const [invitedErr, setInvitedErr] = useState<string | null>(null);
  const [requestingActivation, setRequestingActivation] = useState(false);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<any | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedErr, setAdvancedErr] = useState<string | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [invitedPage, setInvitedPage] = useState(1);
  const [invitedSearch, setInvitedSearch] = useState("");
  const invitedPerPage = 10;
  const [teamData, setTeamData] = useState<any | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamErr, setTeamErr] = useState<string | null>(null);

  const tab = (sp.get("tab") || "orders") as "orders" | "bonuses" | "team" | "referrals" | "slots" | "analytics";
  const justOrdered = sp.get("justOrdered") === "1";

  // Загрузка текущего пользователя (cookie session)
  useEffect(() => {
    let ok = true;
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (!ok) return;
      setMe(data?.authed ? data.user : null);
    })();
    return () => { ok = false; };
  }, []);

  // Загрузка профиля для редактирования
  useEffect(() => {
    let ok = true;
    (async () => {
      const res = await fetch("/api/profile", { cache: "no-store" }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (!ok) return;
      if (data?.ok && data.profile) {
        setProfile(data.profile);
        setPName(data.profile.name ?? "");
        setPAddress(data.profile.address ?? "");
        setPPhone(data.profile.phone ?? "");
      }
    })();
    return () => { ok = false; };
  }, []);

  const saveProfile = async () => {
    setPSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: pName, address: pAddress, phone: pPhone }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.ok && data.profile) {
          setProfile(data.profile);
          // Показываем тост
          const toast = document.createElement("div");
          toast.className = "fixed top-4 right-4 z-50 rounded-xl bg-emerald-500 px-6 py-3 text-white shadow-lg";
          toast.textContent = "Данные сохранены";
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.remove();
          }, 3000);
        }
      }
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setPSaving(false);
    }
  };

  const savePassword = async () => {
    if (!oldPassword) {
      alert("Введите текущий пароль");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      alert("Новый пароль должен быть не менее 4 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Новый пароль и подтверждение не совпадают");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        alert("Пароль успешно изменён");
      } else {
        alert(data?.error || "Ошибка при смене пароля");
      }
    } catch (e) {
      console.error("Failed to save password:", e);
      alert("Ошибка при смене пароля");
    } finally {
      setPasswordSaving(false);
    }
  };


  const refresh = async () => {
    if (!me?.id) return;
    // fetch orders by userId
  };

  // Загрузка заказов по текущему пользователю (cookie session)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!me?.id) {
        if(active) setOrders([]);
        return;
      }
      try {
        setOrdersLoading(true);
        setOrdersErr(null);

        const res = await fetch(`/api/orders?userId=${encodeURIComponent(String(me.id))}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить заказы");

        if(active) setOrders(data.orders || []);
      } catch (e) {
        if(active) setOrdersErr(String((e as any)?.message || e));
      } finally {
        if(active) setOrdersLoading(false);
      }
    })();
    return () => { active = false; };
  }, [me?.id]);

  // Загрузка истории бонусов по текущему пользователю (cookie session)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!me?.id) {
        if(active) {
          setBonusEvents([]);
          setBonusBalance(0);
        }
        return;
      }
      try {
        setBonusLoading(true);
        setBonusErr(null);

        const res = await fetch(`/api/profile/bonus-events?userId=${encodeURIComponent(String(me.id))}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить историю бонусов");

        if(active) {
          setBonusEvents(data.events || []);
          setBonusBalance(data.balance || 0);
        }
      } catch (e) {
        if(active) setBonusErr(String((e as any)?.message || e));
      } finally {
        if(active) setBonusLoading(false);
      }
    })();
    return () => { active = false; };
  }, [me?.id]);

  // Загрузка данных рефералов
  useEffect(() => {
    let active = true;
    (async () => {
      if (!me?.id) {
        if(active) setRef(null);
        return;
      }
      try {
        setRefLoading(true);
        setRefErr(null);
        const res = await fetch("/api/referrals/summary", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить рефералы");
        if(active) setRef(data);
      } catch (e) {
        if(active) setRefErr(String((e as any)?.message || e));
      } finally {
        if(active) setRefLoading(false);
      }
    })();
    return () => { active = false; };
  }, [me?.id]);

  // Загрузка списка приглашённых пользователей
  useEffect(() => {
    let active = true;
    (async () => {
      if (!me?.id) {
        if(active) setInvitedUsers([]);
        return;
      }
      try {
        setInvitedLoading(true);
        setInvitedErr(null);
        const res = await fetch("/api/profile/referrals/invited", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить список приглашённых");
        if(active) setInvitedUsers(data.invited || []);
      } catch (e) {
        if(active) setInvitedErr(String((e as any)?.message || e));
      } finally {
        if(active) setInvitedLoading(false);
      }
    })();
    return () => { active = false; };
  }, [me?.id]);

  // Загрузка данных команды (вкладка "Команда")
  useEffect(() => {
    let active = true;
    (async () => {
      if (!me?.id) {
        if(active) setTeamData(null);
        return;
      }
      try {
        setTeamLoading(true);
        setTeamErr(null);
        const res = await fetch("/api/profile/team", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Не удалось загрузить данные команды");
        if(active) setTeamData(data);
      } catch (e) {
        if(active) setTeamErr(String((e as any)?.message || e));
      } finally {
        if(active) setTeamLoading(false);
      }
    })();
    return () => { active = false; };
  }, [me?.id]);

  // Загрузка расширенной аналитики для блоггеров
  useEffect(() => {
    let active = true;
    (async () => {
      if (!me?.id || !profile?.referralsEnabled) {
        if(active) setAdvancedAnalytics(null);
        return;
      }
      try {
        setAdvancedLoading(true);
        setAdvancedErr(null);
        
        let url = `/api/profile/referrals/advanced-analytics?`;
        if (useCustomDates && dateFrom && dateTo) {
          url += `from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}`;
        } else {
          url += `days=${analyticsDays}`;
        }
        
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Не удалось загрузить аналитику");
        if(active) {
          setAdvancedAnalytics(data);
          setInvitedPage(1); // Сбрасываем на первую страницу при загрузке новых данных
          setInvitedSearch(""); // Сбрасываем поиск
        }
      } catch (e) {
        if(active) setAdvancedErr(String((e as any)?.message || e));
      } finally {
        if(active) setAdvancedLoading(false);
      }
    })();
    return () => { active = false; };
  }, [me?.id, profile?.referralsEnabled, analyticsDays, useCustomDates, dateFrom, dateTo]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  // orders загружаются отдельно через useEffect выше
  const bonuses = data?.bonuses || [];
  const referrals = data?.referrals || [];
  const slots = data?.slots || [];
  // profile загружается через отдельный useEffect и хранится в state

  // Проверяем, есть ли товары в корзине (для кнопки в пустом state)
  const [hasCartItems, setHasCartItems] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cart = localStorage.getItem("cart");
        const items = cart ? JSON.parse(cart) : [];
        setHasCartItems(items.length > 0);
      } catch {
        setHasCartItems(false);
      }
    }
  }, []);

  // Проверяем, только что ли пользователь вошёл (через URL параметр или sessionStorage)
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedIn = sessionStorage.getItem("justLoggedIn") === "true";
      if (loggedIn) {
        setJustLoggedIn(true);
        sessionStorage.removeItem("justLoggedIn");
      }
    }
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:pb-8">
      <AccountHeader />
      <div className="mb-6">
        {justLoggedIn && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">Вы вошли ✅</p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Добро пожаловать в ваш кабинет</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/catalog"
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                >
                  Каталог
                </Link>
                {hasCartItems && (
                  <Link
                    href="/cart"
                    className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                  >
                    Корзина
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">Здесь хранятся ваши заказы и бонусы.</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Бонусы начисляются после доставки заказа.</p>
        {justOrdered ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            Заказ отправлен ✅
          </div>
        ) : null}
      </div>

      {me ? (
        <div className="mb-6 rounded-2xl border dark:border-neutral-800">
          <button
            onClick={() => setProfileExpanded(!profileExpanded)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
          >
            <h2 className="text-lg font-semibold dark:text-white">Профиль</h2>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-5 w-5 text-gray-400 transition-transform ${profileExpanded ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          
          {profileExpanded && (
            <div className="p-6 pt-0 border-t dark:border-neutral-800">
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Логин</label>
                  <input
                    value={me?.login ?? ""}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border px-4 py-3 opacity-80 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Телефон</label>
                  <input
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    placeholder="+7 777 123 45 67"
                    className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Имя</label>
                  <input
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Адрес</label>
                  <input
                    value={pAddress}
                    onChange={(e) => setPAddress(e.target.value)}
                    placeholder="Город, улица, дом, квартира"
                    className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={saveProfile}
                disabled={pSaving}
                className="mt-4 rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {pSaving ? "Сохранение..." : "Сохранить данные"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border p-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">Войдите в систему для просмотра кабинета</div>
        </div>
      )}

      {/* Табы: h-10, px-4, text-sm leading-none whitespace-nowrap — чтобы «Приглашения» не ломало высоту */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/account?tab=orders`}
          className={`h-10 inline-flex flex-shrink-0 items-center justify-center rounded-full border px-4 text-sm leading-none whitespace-nowrap transition ${tab === "orders" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"}`}
        >
          Заказы
        </Link>
        <Link
          href={`/account?tab=bonuses`}
          className={`h-10 inline-flex flex-shrink-0 items-center justify-center rounded-full border px-4 text-sm leading-none whitespace-nowrap transition ${tab === "bonuses" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"}`}
        >
          Бонусы
        </Link>
        <Link
          href={`/account?tab=team`}
          className={`h-10 inline-flex flex-shrink-0 items-center justify-center rounded-full border px-4 text-sm leading-none whitespace-nowrap transition ${tab === "team" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"}`}
        >
          Команда
        </Link>
        {/* Показываем дополнительные табы только если включена реферальная программа (2 уровень открыт) */}
        {profile?.referralsEnabled && (
          <>
            <Link
              href={`/account?tab=referrals`}
              className={`h-10 inline-flex flex-shrink-0 items-center justify-center rounded-full border px-4 text-sm leading-none whitespace-nowrap transition ${tab === "referrals" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"}`}
            >
              Реферальная программа
            </Link>
            <Link
              href={`/account?tab=analytics`}
              className={`h-10 inline-flex flex-shrink-0 items-center justify-center rounded-full border px-4 text-sm leading-none whitespace-nowrap transition ${tab === "analytics" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"}`}
            >
              Аналитика
            </Link>
          </>
        )}
      </div>

      {tab === "orders" ? (
        <div className="mt-2">
          <h2 className="text-2xl font-semibold">Заказы</h2>
          {ordersLoading ? (
            <p className="mt-4 text-gray-600">Загрузка заказов...</p>
          ) : ordersErr ? (
            <p className="mt-4 text-red-600">Ошибка: {ordersErr}</p>
          ) : orders.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center space-y-4 rounded-2xl border p-12 dark:border-neutral-800">
              <p className="text-lg text-gray-600 dark:text-gray-400">У вас пока нет заказов</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Выберите товары в каталоге ✨</p>
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                <Link
                  href="/catalog"
                  className="rounded-xl bg-black px-6 py-3 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Перейти в каталог
                </Link>
                {hasCartItems && (
                  <Link
                    href="/cart"
                    className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                  >
                    Открыть корзину
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="rounded-2xl border p-5 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Заказ #{o.id}
                    </Link>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{fmtMoney(o.totalAmount)}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                        statusBadgeClass(String(o.status ?? "")),
                      ].join(" ")}
                    >
                      {statusRu(String(o.status ?? ""))}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {o.items.map((it) => {
                      const productId = it.productId ?? it.product?.id;
                      const productSlug = it.product?.slug;
                      const productUrl = productSlug && productId
                        ? `/product/${encodeURIComponent(String(productSlug))}-${productId}`
                        : productId
                        ? `/product/${productId}`
                        : null;
                      
                      return (
                        <div key={it.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                          <div className="font-medium dark:text-white">
                            {productUrl ? (
                              <Link
                                href={productUrl}
                                className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {it.product?.name ?? `Товар #${it.productId}`}
                              </Link>
                            ) : (
                              it.product?.name ?? `Товар #${it.productId}`
                            )}
                          </div>
                          <div>
                            {fmtMoney(it.priceAtMoment)} × {it.quantity} = {fmtMoney(it.subtotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {o.customerName || o.customerAddress ? (
                    <div className="mt-4 text-sm text-gray-600">
                      {o.customerName ? <div>Имя: {o.customerName}</div> : null}
                      {o.customerAddress ? <div>Адрес: {o.customerAddress}</div> : null}
                      <div>Телефон: {o.customerPhone}</div>
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="inline-flex rounded-full border px-4 py-2 text-sm dark:border-neutral-800 dark:text-white"
                    >
                      Подробнее
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "bonuses" ? (
        <div className="mt-2">
          <h2 className="text-2xl font-semibold dark:text-white">Бонусы</h2>
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="text-sm text-emerald-700 dark:text-emerald-300">Текущий баланс</div>
            <div className="mt-1 text-3xl font-semibold text-emerald-900 dark:text-emerald-100">
              {fmtMoney(bonusBalance)}
            </div>
          </div>
          {bonusLoading ? (
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка истории бонусов...</p>
          ) : bonusErr ? (
            <p className="mt-4 text-red-600 dark:text-red-400">Ошибка: {bonusErr}</p>
          ) : bonusEvents.length === 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-gray-600 dark:text-gray-400">Пока событий по бонусам нет.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Бонусы начисляются после доставки заказа</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <h3 className="text-lg font-semibold dark:text-white">История движений</h3>
              {bonusEvents.map((b: any) => {
                const amount = b.amount ?? 0;
                const isPositive = amount > 0;
                const referredUser = b.referredUser;
                return (
                  <div key={b.id} className="rounded-2xl border p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">{fmtDate(b.createdAt)}</div>
                        <div className="mt-1 font-medium dark:text-white">{b.type || "Bonus"}</div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {b.note || ""}
                          {referredUser && (
                            <span className="ml-2 text-gray-500 dark:text-gray-400">
                              (от {referredUser.name || referredUser.login || referredUser.phone || `пользователя #${referredUser.id}`})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`text-lg font-semibold ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                        {isPositive ? "+" : ""}
                        {fmtMoney(Math.abs(Number(amount)))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === "referrals" ? (
        <div className="mt-2">
          <h2 className="text-2xl font-semibold dark:text-white">Реферальная программа</h2>
          {!profile?.referralsEnabled ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Приглашайте друзей и получайте бонусы с их заказов</p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Доступ к реферальной программе пока не включён. Оставьте запрос на активацию, и администратор рассмотрит ваш запрос.
              </div>
              {profile?.referralActivationRequested ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                  ✅ Запрос на активацию отправлен. Администратор рассмотрит ваш запрос.
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      setRequestingActivation(true);
                      const res = await fetch("/api/profile/referrals/request-activation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                      });
                      const data = await res.json().catch(() => null);
                      if (!res.ok) throw new Error(data?.error || "Ошибка при отправке запроса");
                      // Обновляем профиль
                      const profileRes = await fetch("/api/profile", { cache: "no-store" });
                      const profileData = await profileRes.json().catch(() => null);
                      if (profileData?.ok && profileData.profile) {
                        setProfile(profileData.profile);
                      }
                      alert("Запрос на активацию отправлен");
                    } catch (e: any) {
                      alert(e?.message || "Ошибка при отправке запроса");
                    } finally {
                      setRequestingActivation(false);
                    }
                  }}
                  disabled={requestingActivation}
                  className="rounded-xl bg-rose-500 px-6 py-3 text-white font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-rose-600 dark:hover:bg-rose-700"
                >
                  {requestingActivation ? "Отправка..." : "Оставить запрос на активацию"}
                </button>
              )}
            </div>
          ) : refLoading ? (
            <div className="mt-4 text-gray-600 dark:text-gray-300">Загрузка...</div>
          ) : refErr ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {refErr}
            </div>
          ) : !ref ? null : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Код</div>
                  <div className="mt-1 font-semibold dark:text-white">{ref.referralCode}</div>
                </div>
                <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Приглашено</div>
                  <div className="mt-1 font-semibold dark:text-white">{ref.invited}</div>
                </div>
                <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-xs text-gray-500 dark:text-gray-400">DONE заказов</div>
                  <div className="mt-1 font-semibold dark:text-white">{ref.doneOrders}</div>
                </div>
              </div>

              <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="text-xs text-gray-500 dark:text-gray-400">Ссылка-приглашение</div>
                <div className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-neutral-800 dark:text-white">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/catalog?ref=${ref.referralCode}`
                    : `/catalog?ref=${ref.referralCode}`}
                </div>
                <button
                  onClick={() => {
                    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/catalog?ref=${ref.referralCode}`;
                    const text = `Я покупаю косметику тут 💄\nЗа покупки дают бонусы.\n\nВот моя ссылка:\n${link}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(whatsappUrl, "_blank");
                  }}
                  className="mt-3 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                >
                  📱 Поделиться в WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "team" ? (
        <div className="mt-2">
          <h2 className="text-2xl font-semibold dark:text-white">Команда</h2>
          
          {teamLoading ? (
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка данных команды...</p>
          ) : teamErr ? (
            <p className="mt-4 text-red-600 dark:text-red-400">Ошибка: {teamErr}</p>
          ) : !teamData ? null : (
            <div className="mt-4 space-y-6">
              {/* Статус 2 уровня */}
              <div className={`rounded-2xl border p-6 ${
                teamData.level2Status === "open" 
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30"
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{teamData.level2Status === "open" ? "✅" : "🔒"}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold dark:text-white">
                      {teamData.level2Status === "open" ? "2 уровень открыт" : "2 уровень закрыт"}
                    </h3>
                    {teamData.level2Status === "open" ? (
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                        Вы получаете 1% с заказов вашей команды (рефералов ваших рефералов)
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        {teamData.level2ConditionText}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Статистика */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Всего рефералов</div>
                  <div className="mt-1 text-2xl font-semibold dark:text-white">{teamData.totalCount || 0}</div>
                </div>
                <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Активных</div>
                  <div className="mt-1 text-2xl font-semibold dark:text-white">{teamData.activeCount || 0}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    (сделали хотя бы 1 заказ)
                  </div>
                </div>
                <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Реферальный код</div>
                  <div className="mt-1 text-lg font-semibold dark:text-white">{teamData.referralCode || "—"}</div>
                </div>
              </div>

              {/* Реферальная ссылка, Копировать, Поделиться в WhatsApp */}
              {teamData.referralCode && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-rose-900 dark:text-rose-100 mb-2">
                      Ваша реферальная ссылка:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/catalog?ref=${teamData.referralCode}`}
                        className="flex-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-rose-800 dark:bg-neutral-900 dark:text-white"
                      />
                      <button
                        onClick={() => {
                          const link = `${typeof window !== "undefined" ? window.location.origin : ""}/catalog?ref=${teamData.referralCode}`;
                          navigator.clipboard.writeText(link);
                          alert("Ссылка скопирована!");
                        }}
                        className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-neutral-900 dark:text-rose-300 dark:hover:bg-neutral-800"
                      >
                        Копировать ссылку
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const link = `${typeof window !== "undefined" ? window.location.origin : ""}/catalog?ref=${teamData.referralCode}`;
                      const text = `Я покупаю косметику тут 💄\nЗа покупки дают бонусы.\n\nВот моя ссылка:\n${link}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.open(whatsappUrl, "_blank");
                    }}
                    className="w-full rounded-lg bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                  >
                    📱 Поделиться в WhatsApp
                  </button>
                  <p className="mt-2 text-xs text-rose-700/80 dark:text-rose-300/80">
                    Друг должен открыть ссылку с телефона (WhatsApp).
                  </p>
                </div>
              )}

              {/* Описание */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Приглашайте друзей и получайте 5% с их покупок.
                </p>
                {teamData.level2Status === "closed" && (
                  <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    Откройте 2 уровень и получайте 1% с заказов их команды.
                  </p>
                )}
              </div>

              {/* Список рефералов */}
              <div>
                <h3 className="text-lg font-semibold dark:text-white mb-4">Рефералы 1 уровня</h3>
                {teamData.referrals && teamData.referrals.length === 0 ? (
                  <div className="rounded-2xl border p-8 text-center dark:border-neutral-800">
                    <p className="text-gray-600 dark:text-gray-400">Пока нет рефералов</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                      Пригласите друзей по реферальному коду: <span className="font-semibold">{teamData.referralCode}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamData.referrals?.map((ref: any) => (
                      <div key={ref.id} className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium dark:text-white">
                                {ref.name || ref.login || ref.phone || `Пользователь #${ref.id}`}
                              </div>
                              {ref.isActive && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                  Активен
                                </span>
                              )}
                            </div>
                            {ref.phone && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ref.phone}</div>
                            )}
                            <div className="mt-2 flex gap-4 text-xs text-gray-600 dark:text-gray-300">
                              <span>Заказов: {ref.doneOrdersCount || 0}</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Бонус: {fmtMoney(ref.earnedBonus || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "slots" && !profile?.referralsEnabled ? (
        <div className="mt-2">
          <h2 className="text-2xl font-semibold dark:text-white">Приглашения</h2>
          {me?.id ? (
            <SlotsGrid userId={me.id} />
          ) : (
            <p className="mt-4 text-gray-600 dark:text-gray-400">Войдите в систему для просмотра приглашений.</p>
          )}
        </div>
      ) : null}

      {tab === "analytics" ? (
        <div className="mt-2">
          <h2 className="text-2xl font-semibold dark:text-white">Аналитика</h2>
          
          {/* Расширенная аналитика для блоггеров */}
          {profile?.referralsEnabled ? (
            <div className="mt-4 space-y-4">
              {/* Выбор периода */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {[7, 14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setUseCustomDates(false);
                        setAnalyticsDays(d);
                      }}
                      disabled={useCustomDates}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        !useCustomDates && analyticsDays === d
                          ? 'bg-rose-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300 dark:hover:bg-neutral-800 disabled:opacity-50'
                      }`}
                    >
                      {d}д
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setUseCustomDates(true);
                      if (!dateFrom || !dateTo) {
                        // Устанавливаем дефолтные даты: сегодня и 30 дней назад
                        const today = new Date();
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(today.getDate() - 30);
                        setDateTo(today.toISOString().split('T')[0]);
                        setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
                      }
                    }}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      useCustomDates
                        ? 'bg-rose-500 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    Выбрать период
                  </button>
                </div>
                
                {useCustomDates && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">С</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">По</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                    {dateFrom && dateTo && (
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            if (new Date(dateFrom) > new Date(dateTo)) {
                              alert("Дата начала не может быть позже даты окончания");
                              return;
                            }
                            // Данные загрузятся автоматически через useEffect
                          }}
                          className="rounded-xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-600"
                        >
                          Применить
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {advancedLoading ? (
                <div className="mt-4 text-gray-600 dark:text-gray-300">Загрузка аналитики...</div>
              ) : advancedErr ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {advancedErr}
                </div>
              ) : !advancedAnalytics ? null : (
                <>
                  {/* Отображение выбранного периода */}
                  {advancedAnalytics.period && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                      <span className="text-gray-600 dark:text-gray-300">Период: </span>
                      <span className="font-semibold dark:text-white">
                        {new Date(advancedAnalytics.period.from).toLocaleDateString('ru-RU')} - {new Date(advancedAnalytics.period.to).toLocaleDateString('ru-RU')}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({advancedAnalytics.period.days} {advancedAnalytics.period.days === 1 ? 'день' : advancedAnalytics.period.days < 5 ? 'дня' : 'дней'})
                      </span>
                    </div>
                  )}
                  
                  {/* Общая статистика */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Приглашено всего</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">{advancedAnalytics.summary.totalInvited}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        За период: {advancedAnalytics.summary.invitedInPeriod}
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Оборот команды (период)</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmtMoney(advancedAnalytics.summary.totalRevenueInPeriod)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {advancedAnalytics.summary.totalOrdersInPeriod} заказов
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Всего: {fmtMoney(advancedAnalytics.summary.totalRevenueAllTime || 0)} ({advancedAnalytics.summary.totalOrdersAllTime || 0} зак.)
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Средний чек (период)</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {fmtMoney(advancedAnalytics.summary.avgOrderValue)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Конверсия: {advancedAnalytics.summary.conversionRate}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Всего: {fmtMoney(advancedAnalytics.summary.avgOrderValueAllTime || 0)} (конв.: {advancedAnalytics.summary.conversionRateAllTime || 0}%)
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Бонусы (период)</div>
                      <div className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                        {fmtMoney(advancedAnalytics.summary.totalBonusInPeriod)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Всего: {fmtMoney(advancedAnalytics.summary.totalBonusAllTime)}
                      </div>
                    </div>
                  </div>

                  {/* Детальная статистика по приглашённым */}
                  <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h3 className="text-lg font-semibold dark:text-white">Детальная статистика по приглашённым</h3>
                      {advancedAnalytics.invitedStats.length > 0 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Поиск по имени, телефону..."
                            value={invitedSearch}
                            onChange={(e) => {
                              setInvitedSearch(e.target.value);
                              setInvitedPage(1); // Сбрасываем на первую страницу при поиске
                            }}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                    
                    {advancedAnalytics.invitedStats.length === 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-300">Пока нет приглашённых пользователей</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Пригласите друзей, чтобы начать зарабатывать бонусы</div>
                      </div>
                    ) : (() => {
                      // Фильтрация по поисковому запросу
                      const filteredUsers = advancedAnalytics.invitedStats.filter((user: any) => {
                        if (!invitedSearch.trim()) return true;
                        const search = invitedSearch.toLowerCase();
                        const name = (user.name || "").toLowerCase();
                        const phone = (user.phone || "").toLowerCase();
                        const login = (user.login || "").toLowerCase();
                        return name.includes(search) || phone.includes(search) || login.includes(search);
                      });
                      
                      // Пагинация
                      const totalPages = Math.ceil(filteredUsers.length / invitedPerPage);
                      const startIndex = (invitedPage - 1) * invitedPerPage;
                      const endIndex = startIndex + invitedPerPage;
                      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
                      
                      return (
                        <>
                          <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                            Показано {paginatedUsers.length} из {filteredUsers.length} пользователей
                            {invitedSearch && ` (найдено по запросу "${invitedSearch}")`}
                          </div>
                          
                          <div className="space-y-3">
                            {paginatedUsers.map((user: any) => (
                              <div key={user.id} className="rounded-lg border p-4 dark:border-neutral-700">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                  <div className="flex-1 min-w-[200px]">
                                    <div className="font-medium dark:text-white">
                                      {user.name || user.login || user.phone || `Пользователь #${user.id}`}
                                    </div>
                                    {user.phone && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.phone}</div>
                                    )}
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Зарегистрирован: {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Оборот (период)</div>
                                      <div className="font-semibold dark:text-white mt-1">{fmtMoney(user.revenueInPeriod)}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Всего: {fmtMoney(user.totalRevenue)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Заказов (период)</div>
                                      <div className="font-semibold dark:text-white mt-1">{user.ordersCountInPeriod}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">DONE: {user.doneOrders}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Средний чек</div>
                                      <div className="font-semibold dark:text-white mt-1">{fmtMoney(user.avgOrderValue)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-emerald-600 dark:text-emerald-400">Бонус (период)</div>
                                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mt-1">{fmtMoney(user.bonusInPeriod)}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Всего: {fmtMoney(user.totalBonus)}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Пагинация */}
                          {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => setInvitedPage(1)}
                                disabled={invitedPage === 1}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                              >
                                ««
                              </button>
                              <button
                                onClick={() => setInvitedPage(p => Math.max(1, p - 1))}
                                disabled={invitedPage === 1}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                              >
                                ‹
                              </button>
                              
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (invitedPage <= 3) {
                                  pageNum = i + 1;
                                } else if (invitedPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = invitedPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setInvitedPage(pageNum)}
                                    className={`rounded-xl px-3 py-2 text-sm ${
                                      invitedPage === pageNum
                                        ? 'bg-rose-500 text-white'
                                        : 'border border-slate-200 bg-white hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                              
                              <button
                                onClick={() => setInvitedPage(p => Math.min(totalPages, p + 1))}
                                disabled={invitedPage === totalPages}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                              >
                                ›
                              </button>
                              <button
                                onClick={() => setInvitedPage(totalPages)}
                                disabled={invitedPage === totalPages}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                              >
                                »»
                              </button>
                              
                              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                Страница {invitedPage} из {totalPages}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Обычная аналитика для обычных пользователей */
            <>
              {refLoading || invitedLoading ? (
                <div className="mt-4 text-gray-600 dark:text-gray-300">Загрузка...</div>
              ) : refErr || invitedErr ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {refErr || invitedErr}
                </div>
              ) : !ref ? null : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Заработано бонусов</div>
                    <div className="mt-1 text-2xl font-semibold dark:text-white">{fmtMoney(ref.earnedBonus)}</div>
                  </div>

                  <div className="rounded-xl border p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h3 className="text-lg font-semibold dark:text-white mb-4">Приглашённые пользователи</h3>
                    {invitedLoading ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">Загрузка...</div>
                    ) : invitedErr ? (
                      <div className="text-sm text-red-600 dark:text-red-400">{invitedErr}</div>
                    ) : invitedUsers.length === 0 ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">Пока нет приглашённых пользователей</div>
                    ) : (
                      <div className="space-y-3">
                        {invitedUsers.map((user: any) => (
                          <div key={user.id} className="rounded-lg border p-3 dark:border-neutral-700">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-medium dark:text-white">
                                  {user.name || user.login || user.phone || `Пользователь #${user.id}`}
                                </div>
                                {user.phone && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.phone}</div>
                                )}
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Зарегистрирован: {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400">DONE заказов</div>
                                <div className="font-semibold dark:text-white">{user.doneOrders || 0}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Оборот</div>
                                <div className="font-semibold dark:text-white">{fmtMoney(user.totalRevenue || 0)}</div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Бонус</div>
                                <div className="font-semibold text-emerald-700 dark:text-emerald-400">{fmtMoney(user.earnedBonus || 0)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

    </main>
  );
}
