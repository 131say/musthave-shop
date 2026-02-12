'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OrderStatusSelect } from './OrderStatusSelect';
import { ReturnModal } from './ReturnModal';

function statusLabel(s: string) {
  const labels: Record<string, string> = {
    NEW: 'Принят',
    PROCESSING: 'В работе',
    PAID: 'Оплачен',
    SHIPPED: 'Отправлен',
    DONE: 'Выполнен',
    CANCELLED: 'Отменён',
  };
  return labels[s] || s;
}

function StatusPill({ status }: { status: string }) {
  const base = 'rounded-full px-2 py-0.5 text-[11px] font-medium border';
  const displayStatus = statusLabel(status);
  const cls =
    status === 'NEW'
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
      : status === 'PROCESSING'
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
        : status === 'PAID'
          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
          : status === 'SHIPPED'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
            : status === 'DONE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
              : status === 'CANCELLED'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700';
  return <span className={`${base} ${cls}`}>{displayStatus}</span>;
}

function formatDeliveryTime(deliveryTime: string): string {
  try {
    const date = new Date(deliveryTime);
    if (isNaN(date.getTime())) return deliveryTime;

    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${month} в ${hours}:${minutes}`;
  } catch {
    return deliveryTime;
  }
}

export function OrderCard({ order }: { order: any }) {
  const [showReturnModal, setShowReturnModal] = useState(false);
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

  const hasReturnableItems = order.items.some(
    (item: any) => (item.returnedQuantity || 0) < item.quantity
  );

  const handleReturnSuccess = () => {
    window.location.reload();
  };

  return (
    <>
      <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-neutral-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-gray-500">№ {order.id}</span>
              <StatusPill status={order.status} />
            </div>
            <div className="text-xs text-slate-500 dark:text-gray-400">
              {format(order.createdAt, 'dd.MM.yyyy HH:mm', {
                locale: ru,
              })}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-slate-500 dark:text-gray-400">Сумма</div>
            <div className="text-sm font-semibold dark:text-white">
              {order.totalAmount.toLocaleString('ru-RU')} ₸
              <div className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                {order.bonusSpent > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    −{order.bonusSpent.toLocaleString('ru-RU')} ₸ бонусами
                  </span>
                )}
                <span className={order.bonusSpent > 0 ? "ml-2" : ""}>
                  деньгами: {(order.cashPaid || Math.max(0, order.totalAmount - (order.bonusSpent || 0))).toLocaleString('ru-RU')} ₸
                </span>
              </div>
            </div>
            {customer && (
              <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                Баланс клиента:{' '}
                <span className="font-semibold">{customer.bonusBalance.toLocaleString('ru-RU')} ₸</span>
              </div>
            )}
            <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
            {hasReturnableItems && order.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
              >
                Возврат
              </button>
            )}
          </div>
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
                  <span className="text-sm font-medium dark:text-white">{formatDeliveryTime(order.deliveryTime)}</span>
                </div>
              )}
              {order.comment && (
                <div>
                  <span className="text-xs text-slate-400 dark:text-gray-500">Комментарий: </span>
                  <span className="text-sm dark:text-gray-300">{order.comment}</span>
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
                      Пригласитель: <span className="font-medium">{inviter.name || inviter.phone}</span>
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
              {order.items.map((item: any) => {
                const returnedQty = item.returnedQuantity || 0;
                const remainingQty = item.quantity - returnedQty;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1">
                      <div className="font-medium dark:text-white">
                        {item.product?.name ?? `ID ${item.productId}`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">
                        {item.priceAtMoment.toLocaleString('ru-RU')} ₸ × {item.quantity}
                        {returnedQty > 0 && (
                          <span className="ml-1 text-rose-600 dark:text-rose-400">
                            (возвращено: {returnedQty})
                          </span>
                        )}
                      </div>
                      {returnedQty > 0 && (
                        <div className="text-[11px] text-slate-500 dark:text-gray-400">
                          Осталось: {remainingQty} шт.
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-800 dark:text-white">
                      {item.subtotal.toLocaleString('ru-RU')} ₸
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </article>

      <ReturnModal
        orderId={order.id}
        items={order.items}
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSuccess={handleReturnSuccess}
      />
    </>
  );
}

