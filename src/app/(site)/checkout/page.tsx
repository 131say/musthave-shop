"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useRef } from "react"
import { clearCart, onCartChanged, readCart, cartTotal } from "@/lib/cart"
import CheckoutHeader from "./CheckoutHeader"

export default function CheckoutPage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bonusToSpend, setBonusToSpend] = useState(0);
  const [useBonus, setUseBonus] = useState(false); // Toggle "Использовать бонусы"
  const [profile, setProfile] = useState<any | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [bonusPercent, setBonusPercent] = useState<number | null>(null); // Процент бонусов из настроек
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false); // Индикатор загрузки профиля
  const [saveToProfile, setSaveToProfile] = useState(false); // Чекбокс "Сохранить для следующих заказов"
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  
  // Автофокус на поле телефона при загрузке (только если поле пустое после загрузки профиля)
  useEffect(() => {
    if (mounted && prefillLoaded && phoneInputRef.current && !phone) {
      // Небольшая задержка для лучшего UX
      const timer = setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mounted, prefillLoaded, phone]);

  // keep cart in sync
  useEffect(() => {
    if (!mounted) return;
    const sync = () => setItems(readCart());
    sync();
    return onCartChanged(sync);
  }, [mounted]);

  const total = useMemo(() => cartTotal(items as any), [items]);

  // Загрузка профиля для автозаполнения (только 1 раз при монтировании)
  // С retry для случая "логин → сразу checkout" (куки могут ещё не успеть установиться)
  useEffect(() => {
    if (prefillLoaded) return;
    
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500; // 500ms между попытками
    
    const loadProfile = async (): Promise<void> => {
      try {
        setPrefillLoading(true);
        
        // Пробуем загрузить профиль напрямую (он требует auth, вернёт 401 если не авторизован)
        const r = await fetch("/api/profile", { cache: "no-store" });
        
        // Если 401 (не авторизован) и это не последняя попытка - ждём и повторяем
        if (r.status === 401 && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`[CHECKOUT] Auth not ready yet (401), retry ${retryCount}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return loadProfile();
        }
        
        // Если не авторизован после всех попыток - это нормально (гостевой чекаут)
        if (!r.ok) {
          console.log("[CHECKOUT] Profile fetch failed or user not authenticated, skipping prefilling");
          setPrefillLoaded(true);
          setPrefillLoading(false);
          return;
        }
        const j = await r.json();
        const p = j?.profile;
        if (!p) {
          console.log("[CHECKOUT] No profile data received");
          setPrefillLoaded(true);
          return;
        }
        console.log("[CHECKOUT] Profile loaded for prefilling:", { 
          name: p.name, 
          phone: p.phone, 
          address: p.address,
          hasName: !!(p.name && String(p.name).trim()),
          hasPhone: !!(p.phone && String(p.phone).trim()),
          hasAddress: !!(p.address && String(p.address).trim()),
        });
        
        // Заполняем из профиля при первой загрузке (если поля пустые)
        // Это позволяет пользователю редактировать данные, если нужно
        setName((v) => {
          // Если поле уже заполнено пользователем, не перезаписываем
          if (v && v.trim()) {
            console.log("[CHECKOUT] Name field already has value, not overwriting:", v);
            return v;
          }
          // Иначе заполняем из профиля
          const profileName = p.name;
          const nameValue = (profileName && String(profileName).trim()) ? String(profileName).trim() : "";
          if (nameValue) {
            console.log("[CHECKOUT] Prefilling name from profile:", nameValue);
          }
          return nameValue;
        });
        setPhone((v) => {
          if (v && v.trim()) {
            console.log("[CHECKOUT] Phone field already has value, not overwriting:", v);
            return v;
          }
          const profilePhone = p.phone;
          const phoneValue = (profilePhone && String(profilePhone).trim()) ? String(profilePhone).trim() : "";
          if (phoneValue) {
            console.log("[CHECKOUT] Prefilling phone from profile:", phoneValue);
          }
          return phoneValue;
        });
        setAddress((v) => {
          if (v && v.trim()) {
            console.log("[CHECKOUT] Address field already has value, not overwriting:", v);
            return v;
          }
          const profileAddress = p.address;
          const addressValue = (profileAddress && String(profileAddress).trim()) ? String(profileAddress).trim() : "";
          if (addressValue) {
            console.log("[CHECKOUT] Prefilling address from profile:", addressValue);
          }
          return addressValue;
        });
        setProfile(p);
        
        // Устанавливаем чекбокс "Сохранить": включён если профиль пустой, выключен если заполнен
        const hasName = !!(p.name && String(p.name).trim());
        const hasAddress = !!(p.address && String(p.address).trim());
        const profileIsEmpty = !hasName && !hasAddress;
        setSaveToProfile(profileIsEmpty);
      } catch (e) {
        // Игнорируем ошибки при загрузке профиля
        console.error("[CHECKOUT] Failed to load profile for prefilling:", e);
        // Если не авторизован - чекбокс по умолчанию включён (для новых пользователей)
        setSaveToProfile(true);
      } finally {
        setPrefillLoaded(true);
        setPrefillLoading(false);
      }
    };
    
    loadProfile();
  }, [prefillLoaded]);

  // Загрузка баланса бонусов (только если пользователь авторизован)
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json().catch(() => null);
        if (!ok || !meData?.authed || !meData?.user?.id) {
          // Пользователь не авторизован - это нормально для гостевого чекаута
          setBonusBalance(null);
          return;
        }
        
        const bonusRes = await fetch(`/api/profile/bonus-events?userId=${encodeURIComponent(String(meData.user.id))}`, { cache: "no-store" });
        const bonusData = await bonusRes.json().catch(() => null);
        if (!ok) return;
        if (bonusData?.ok && typeof bonusData.balance === 'number') {
          setBonusBalance(bonusData.balance);
        } else {
          setBonusBalance(0);
        }
      } catch (e) {
        // ignore
        setBonusBalance(null);
      }
    })();
    return () => { ok = false; };
  }, []);

  // Загрузка процента бонусов из настроек
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await fetch("/api/settings/public", { cache: "no-store" });
        if (!ok) return;
        const data = await res.json().catch(() => null);
        if (data?.ok && typeof data.bonusPercent === 'number') {
          setBonusPercent(data.bonusPercent);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { ok = false; };
  }, []);

  // Вычисляем максимально доступные бонусы для списания
  const maxRedeem = useMemo(() => {
    if (!bonusBalance || bonusBalance <= 0 || total <= 0) return 0;
    return Math.min(bonusBalance, total);
  }, [bonusBalance, total]);

  // Сбрасываем bonusToSpend при выключении toggle
  useEffect(() => {
    if (!useBonus) {
      setBonusToSpend(0);
    }
  }, [useBonus]);

  if (!mounted) return null;

  async function submit() {
    setErr(null);
    if (!items?.length) return setErr("Корзина пуста.");
    if (!phone) return setErr("Укажи телефон.");
    if (!name) return setErr("Укажи имя.");
    if (!address) return setErr("Укажи адрес.");

    setSubmitting(true);
    try {
      // Получаем реферальный код из URL или localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get("ref");
      const refFromStorage = typeof window !== "undefined" ? localStorage.getItem("musthave_referral_ref") : null;
      const refCode = refFromUrl || refFromStorage; // Приоритет URL, потом localStorage

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerAddress: address,
          comment: comment.trim() || undefined,
          deliveryTime: deliveryTime && deliveryTime.trim() ? deliveryTime.trim() : undefined,
          bonusToSpend: useBonus ? bonusToSpend : 0, // Отправляем только если toggle включен
          items: items.map((x: any) => ({ id: x.id, qty: x.qty })),
          ref: refCode || undefined,
        }),
      })
      
      if (!res.ok) {
        const txt = await res.text();
        let errorMsg = txt || "Ошибка оформления заказа";
        try {
          const errorData = JSON.parse(txt);
          errorMsg = errorData.error || errorMsg;
        } catch {
          // не JSON, используем текст как есть
        }
        throw new Error(errorMsg);
      }

      const data = await res.json().catch(() => null);
      if (!data?.orderId && !data?.id) {
        throw new Error("orderId не вернулся из /api/orders");
      }
      
      const orderId = data?.orderId || data?.id;
      const isNewUser = data?.isNewUser || false;

      // НЕ удаляем ref здесь - удаляем только после успешной привязки в OTP verify
      // Это позволяет пользователю привязаться позже, если заказ был оформлен гостем

      // Если чекбокс "Сохранить для следующих заказов" включён - обновляем профиль
      // Сохраняем только если данные валидные (не пустые)
      if (saveToProfile && name.trim() && address.trim()) {
        try {
          const profileRes = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              address: address.trim(),
              // Телефон не обновляем через профиль (он идентификатор аккаунта)
            }),
          });
          
          if (profileRes.ok) {
            console.log("[CHECKOUT] Profile updated with checkout data");
          }
        } catch (e) {
          // Игнорируем ошибки сохранения профиля - заказ уже создан
          console.error("[CHECKOUT] Failed to save profile:", e);
        }
      }

      // clear cart after successful order
      clearCart();

      // Перенаправляем на страницу ожидания оплаты
      router.push(`/checkout/payment?orderId=${encodeURIComponent(String(orderId))}&isNewUser=${isNewUser ? "1" : "0"}`);
      return;
    } catch (e: any) {
      setErr(e?.message || "Ошибка оформления заказа");
    } finally {
      setSubmitting(false);
    }
  }

  const finalTotal = total - bonusToSpend;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 pb-24 md:pb-8">
      <CheckoutHeader />

      <h1 className="text-4xl font-semibold dark:text-white">Оформление заказа</h1>
      <div className="mt-3 flex items-center gap-2">
        <p className="text-base text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Без регистрации. Оплата через Kaspi.
        </p>
        <svg className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="rounded-2xl border p-6 dark:border-neutral-800">
          <h2 className="text-2xl font-semibold dark:text-white">Твои товары</h2>
          {items.length ? (
            <div className="mt-4 space-y-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-4 border-b border-gray-200 pb-4 last:border-0 last:pb-0 dark:border-neutral-700">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-neutral-800">
                    <img
                      src={it.imageUrl ?? "/images/placeholder.svg"}
                      alt={it.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{it.brandName ?? ""}</div>
                    <div className="font-medium dark:text-white line-clamp-2">{it.name}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {it.price.toLocaleString("ru-RU")} ₸ × {it.qty}
                    </div>
                  </div>
                  <div className="shrink-0 text-lg font-bold dark:text-white">
                    {(it.price * it.qty).toLocaleString("ru-RU")} ₸
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-600 dark:text-gray-300">Пока пусто.</p>
          )}

          <div className="mt-6 space-y-2 border-t pt-4 dark:border-neutral-800">
            {/* Показываем бонусы только если пользователь авторизован и есть бонусы */}
            {bonusBalance !== null && bonusBalance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Доступно бонусов:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{bonusBalance.toLocaleString("ru-RU")} ₸</span>
              </div>
            )}
            {bonusBalance === null && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Бонусы начисляются участникам клуба после покупки
              </div>
            )}
            <div className="flex items-center justify-between border-t-2 border-gray-200 pt-4 dark:border-neutral-700">
              <div className="text-xl font-semibold dark:text-white">Итого</div>
              <div className="text-2xl font-bold dark:text-white">{total.toLocaleString("ru-RU")} ₸</div>
            </div>
            {bonusToSpend > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Списано бонусами:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">-{bonusToSpend.toLocaleString("ru-RU")} ₸</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-neutral-700">
                  <div className="text-xl font-semibold dark:text-white">К оплате</div>
                  <div className="text-2xl font-bold dark:text-white">{finalTotal.toLocaleString("ru-RU")} ₸</div>
                </div>
              </>
            )}
            {bonusToSpend === 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>К оплате</span>
                <span className="font-semibold">{total.toLocaleString("ru-RU")} ₸</span>
              </div>
            )}

            {/* Блок бонусов (до оплаты) */}
            {finalTotal > 0 && bonusPercent !== null && bonusPercent > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                {profile ? (
                  // Для авторизованных пользователей
                  <>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💰</span>
                      <div className="flex-1">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          За этот заказ вы получите +{Math.floor(finalTotal * bonusPercent / 100).toLocaleString("ru-RU")} бонусов
                        </p>
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                          Бонусы начисляются после доставки заказа
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  // Для гостей
                  <>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💰</span>
                      <div className="flex-1">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          Вступите в клуб и получайте бонусы с покупок
                        </p>
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                          Бонусы начисляются зарегистрированным клиентам
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border p-6 dark:border-neutral-800">
          <h2 className="text-2xl font-semibold dark:text-white">Контакты</h2>
          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {err}
            </div>
          ) : null}

          {/* Индикатор загрузки профиля */}
          {prefillLoading && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Загружаем ваши данные…</span>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block">
              <div className="mb-2 font-medium dark:text-white">Имя <span className="text-red-500">*</span></div>
              <input
                className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <div className="mb-2 font-medium dark:text-white">Телефон <span className="text-red-500">*</span></div>
              <input
                ref={phoneInputRef}
                type="tel"
                className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 777 123 45 67"
                required
                readOnly={!!(profile && profile.phone)}
                disabled={!!(profile && profile.phone)}
              />
              {profile && profile.phone && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Номер аккаунта (изменить можно через повторный вход)
                </div>
              )}
            </label>

            <label className="block">
              <div className="mb-2 font-medium dark:text-white">Адрес доставки <span className="text-red-500">*</span></div>
              <input
                className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Город, улица, дом, квартира"
                required
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Например: Алматы, ул. Абая, д. 150, кв. 25
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Курьер уточнит детали при необходимости
              </div>
            </label>

            {/* Чекбокс "Сохранить для следующих заказов" - показываем только если пользователь авторизован */}
            {profile && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium dark:text-white">
                    Сохранить обновлённые данные для следующих заказов
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Имя и адрес будут автоматически заполняться при следующем оформлении
                  </div>
                </div>
              </label>
            )}

            <label className="block">
              <div className="mb-2 font-medium dark:text-white">Дата и время доставки</div>
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                Если не укажете — согласуем в WhatsApp
              </div>
              <input
                type="datetime-local"
                className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </label>

            <label className="block">
              <div className="mb-2 font-medium dark:text-white">Комментарий к заказу</div>
              <textarea
                className="w-full rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Дополнительная информация, пожелания по доставке и т.д."
              />
            </label>

            {/* Блок использования бонусов - только для авторизованных с балансом > 0 */}
            {total > 0 && bonusBalance !== null && bonusBalance > 0 && (
              <div className="block">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBonus}
                    onChange={(e) => setUseBonus(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium dark:text-white">
                      Использовать бонусы
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Ваш баланс: <span className="font-semibold text-green-600 dark:text-green-400">{bonusBalance.toLocaleString("ru-RU")} ₸</span>
                    </div>
                  </div>
                </label>

                {/* Поле ввода суммы бонусов - показывается только если toggle включен */}
                {useBonus && (
                  <div className="mt-4">
                    <div className="mb-2">
                      <span className="text-sm font-medium dark:text-white">Списать:</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="flex-1 rounded-xl border px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                        value={bonusToSpend === 0 ? "" : String(bonusToSpend)}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Если поле пустое, разрешаем пустое значение
                          if (inputValue === "" || inputValue === null || inputValue === undefined) {
                            setBonusToSpend(0);
                            return;
                          }
                          // Убираем все нецифровые символы
                          const digitsOnly = inputValue.replace(/\D/g, "");
                          // Убираем ведущие нули
                          const cleanValue = digitsOnly.replace(/^0+/, "") || "0";
                          const numValue = Number(cleanValue);
                          if (isNaN(numValue) || numValue < 0) {
                            return;
                          }
                          // Ограничиваем максимумом доступных бонусов
                          const val = Math.min(numValue, maxRedeem);
                          setBonusToSpend(val);
                        }}
                        onBlur={(e) => {
                          // При потере фокуса, если поле пустое, устанавливаем 0
                          if (e.target.value === "" || e.target.value === null) {
                            setBonusToSpend(0);
                          }
                        }}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setBonusToSpend(maxRedeem)}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                      >
                        Максимум
                      </button>
                    </div>
                    {maxRedeem > 0 && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Максимум можно списать: {maxRedeem.toLocaleString("ru-RU")} ₸
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          <button
            onClick={submit}
            disabled={submitting}
            className="hidden md:block w-full rounded-xl bg-amber-600 px-4 py-3 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Оформляю заказ..." : `Оформить заказ · ${finalTotal.toLocaleString("ru-RU")} ₸`}
          </button>
          <div className="hidden md:block mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Мы напишем вам в WhatsApp или SMS для подтверждения заказа</span>
          </div>
          
          {/* Sticky кнопка для мобильных */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-full max-w-full border-t border-gray-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto w-full max-w-full px-4 py-3">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-xl bg-amber-600 px-4 py-4 text-base font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Оформляю заказ..." : `Оформить заказ · ${finalTotal.toLocaleString("ru-RU")} ₸`}
              </button>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span>Мы напишем вам в WhatsApp или SMS для подтверждения заказа</span>
              </div>
            </div>
          </div>
        </div>
        </section>
      </div>
    </main>
  )
}
