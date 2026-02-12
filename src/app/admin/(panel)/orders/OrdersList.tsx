'use client';

import { useMemo, useState } from 'react';
import { OrderStatusSelect } from './OrderStatusSelect';

type Status = 'NEW' | 'PROCESSING' | 'DONE' | 'CANCELLED';

const statusRu: Record<string, string> = {
  NEW: 'Принят',
  PROCESSING: 'В работе',
  DONE: 'Выполнен',
  CANCELLED: 'Отменён',
};

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

export function OrdersList({ orders: initialOrders }: { orders: any[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL');
  const [inviterLogin, setInviterLogin] = useState('');
  const [inviteeLogin, setInviteeLogin] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      if (statusFilter !== 'ALL' && String(o.status) !== statusFilter) return false;
      if (!needle) return true;
      const hay = [
        String(o.id ?? ''),
        String(o.customerName ?? ''),
        String(o.customerPhone ?? ''),
        String(o.customerAddress ?? ''),
        String(o.user?.login ?? ''),
        String(o.user?.phone ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [orders, q, statusFilter]);

  const setStatus = async (orderId: number, status: Status) => {
    try {
      const res = await fetch('/api/orders/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Ошибка смены статуса');
      // Обновляем локальное состояние заказа
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  };

  return (
    <>
      <div className="mt-6 rounded-2xl border p-5 dark:border-neutral-800">
        <div className="font-semibold dark:text-white">Привязать приглашённого к пригласившему (занимает слот)</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={inviterLogin}
            onChange={(e) => setInviterLogin(e.target.value)}
            placeholder="inviter login"
            className="w-full rounded-xl border px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
          <input
            value={inviteeLogin}
            onChange={(e) => setInviteeLogin(e.target.value)}
            placeholder="invitee login"
            className="w-full rounded-xl border px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
          <button
            onClick={async () => {
              const res = await fetch("/api/admin/referrals/assign", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ inviterLogin, inviteeLogin }),
              }).catch(() => null);
              const data = res ? await res.json().catch(() => null) : null;
              if (!res || !res.ok || !data?.ok) {
                alert(data?.error || "Ошибка привязки");
                return;
              }
              alert("Готово: приглашённый привязан, слот списан");
              setInviterLogin("");
              setInviteeLogin("");
            }}
            className="rounded-2xl bg-black px-5 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Привязать
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Условия: invitee ещё не привязан, у inviter есть свободные слоты.
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: id / имя / телефон / логин..."
            className="w-full md:w-96 rounded-xl border px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-56 rounded-xl border px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          >
            <option value="ALL">Все статусы</option>
            <option value="NEW">Принят</option>
            <option value="PROCESSING">В работе</option>
            <option value="DONE">Выполнен</option>
            <option value="CANCELLED">Отменён</option>
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {filtered.map((order) => (
          <OrderCard key={order.id} order={order} onStatusChange={setStatus} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-300">
            Заказов не найдено по выбранным фильтрам.
          </div>
        )}
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const base = 'rounded-full px-2 py-0.5 text-[11px] font-medium border';
  const cls =
    status === 'NEW'
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
      : status === 'PROCESSING'
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
        : status === 'DONE'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
          : status === 'CANCELLED'
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
            : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700';
  return <span className={`${base} ${cls}`}>{statusRu[status] ?? status}</span>;
}

function OrderCard({ order, onStatusChange }: { order: any; onStatusChange: (orderId: number, status: Status) => void }) {
  const customer = order.user;
  const inviter = customer?.referredBy ?? null;

  const eventsForOrder = order.referralEvents;

  // Бонус клиента - только ORDER_BONUS события (кэшбэк за заказ)
  const customerBonusForOrder = eventsForOrder
    .filter((e: any) => e.userId === customer?.id && e.type === "ORDER_BONUS")
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  // Бонус пригласителя - только ORDER_BONUS события
  const inviterBonusForOrder = eventsForOrder
    .filter((e: any) => e.userId === inviter?.id && e.type === "ORDER_BONUS")
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-neutral-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-gray-500">№ {order.id}</span>
            <StatusPill status={order.status} />
          </div>
          <div className="text-xs text-slate-500 dark:text-gray-400">
            {new Date(order.createdAt).toLocaleString('ru-RU')}
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs text-slate-500 dark:text-gray-400">Сумма</div>
          <div className="text-sm font-semibold dark:text-white">
            {order.totalAmount.toLocaleString('ru-RU')} ₸
            {order.bonusSpent > 0 && (
              <div className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                <span className="text-emerald-700 dark:text-emerald-400">−{order.bonusSpent.toLocaleString('ru-RU')} ₸ бонусами</span>
                <span className="ml-2 dark:text-gray-300">деньгами: {order.cashPaid.toLocaleString('ru-RU')} ₸</span>
              </div>
            )}
          </div>
          {customer && (
            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              Баланс клиента:{' '}
              <span className="font-semibold">
                {customer.bonusBalance.toLocaleString('ru-RU')} ₸
              </span>
            </div>
          )}
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === 'NEW' && (
          <button
            onClick={() => onStatusChange(order.id, 'PROCESSING')}
            className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50 dark:border-neutral-800 dark:text-white dark:hover:bg-neutral-800"
          >
            В работу
          </button>
        )}
        {order.status !== 'DONE' && (
          <button
            onClick={() => onStatusChange(order.id, 'DONE')}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
          >
            Выполнен
          </button>
        )}
        {order.status !== 'CANCELLED' && (
          <button
            onClick={() => onStatusChange(order.id, 'CANCELLED')}
            className="rounded-full bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
          >
            Отменить
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr,1.4fr]">
        {/* Информация о клиенте + рефералка */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div>
              <span className="text-xs text-slate-400 dark:text-gray-500">Имя: </span>
              <span className="text-sm font-medium dark:text-white">{order.customerName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-gray-500">Телефон: </span>
              <span className="text-sm dark:text-gray-300">{order.customerPhone}</span>
            </div>
            {order.customerAddress && (
              <div>
                <span className="text-xs text-slate-400 dark:text-gray-500">Адрес: </span>
                <span className="text-sm dark:text-gray-300">{order.customerAddress}</span>
              </div>
            )}
            {order.deliveryTime && (
              <div>
                <span className="text-xs text-slate-400 dark:text-gray-500">Дата и время доставки: </span>
                <span className="text-sm font-medium dark:text-white">
                  {formatDeliveryTime(order.deliveryTime)}
                </span>
              </div>
            )}
            {order.comment && (
              <div>
                <span className="text-xs text-slate-400 dark:text-gray-500">Комментарий: </span>
                <span className="text-sm dark:text-gray-300">{order.comment}</span>
              </div>
            )}
            {customer?.login && (
              <div>
                <span className="text-xs text-slate-400 dark:text-gray-500">Аккаунт: </span>
                <span className="text-sm dark:text-gray-300">{customer.login}</span>
              </div>
            )}
          </div>

          {customer && (
            <div className="rounded-xl bg-rose-50/70 px-3 py-2 text-[11px] text-slate-700 dark:bg-rose-900/30 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold dark:text-white">Реферальная информация</span>
                <span className="text-rose-500 dark:text-rose-400">{customer.referralCode}</span>
              </div>
              {inviter ? (
                <div className="mt-1 text-[11px] dark:text-gray-300">
                  <div>
                    Пригласитель:{' '}
                    <span className="font-medium">
                      {inviter.name || inviter.phone}
                    </span>
                  </div>
                  {inviterBonusForOrder !== 0 && (
                    <div>
                      Бонус пригласителю за заказ:{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {inviterBonusForOrder.toLocaleString('ru-RU')} ₸
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                  Клиент без пригласителя (прямой заход).
                </div>
              )}
              {customerBonusForOrder !== 0 && (
                <div className="mt-1 text-[11px] dark:text-gray-300">
                  Бонус клиента за этот заказ:{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {customerBonusForOrder.toLocaleString('ru-RU')} ₸
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Товары */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">Товары</div>
          <ul className="space-y-1.5">
            {order.items.map((item: any) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1">
                  <div className="font-medium dark:text-white">
                    {item.product?.name ?? `ID ${item.productId}`}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">
                    {item.priceAtMoment.toLocaleString('ru-RU')} ₸ ×{' '}
                    {item.quantity}
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-slate-800 dark:text-white">
                  {item.subtotal.toLocaleString('ru-RU')} ₸
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

