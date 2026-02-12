// src/app/(admin)/orders/page.tsx
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

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

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        include: {
          referredBy: true,
        },
      },
      referralEvents: true,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Заказы</h2>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">Пока нет заказов.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const customer = order.user;
            const inviter = customer?.referredBy ?? null;

            const eventsForOrder = order.referralEvents;

            // Бонус клиента - только ORDER_BONUS события (кэшбэк за заказ)
            const customerBonusForOrder = eventsForOrder
              .filter((e) => e.userId === customer?.id && e.type === "ORDER_BONUS")
              .reduce((sum, e) => sum + e.amount, 0);

            // Бонус пригласителя - только ORDER_BONUS события
            const inviterBonusForOrder = eventsForOrder
              .filter((e) => e.userId === inviter?.id && e.type === "ORDER_BONUS")
              .reduce((sum, e) => sum + e.amount, 0);

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        № {order.id}
                      </span>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] uppercase text-rose-500">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(order.createdAt, 'dd.MM.yyyy HH:mm', {
                        locale: ru,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Сумма</div>
                    <div className="text-base font-semibold">
                      {order.totalAmount.toLocaleString('ru-RU')} ₸
                    </div>
                    {customer && (
                      <div className="mt-1 text-[11px] text-emerald-600">
                        Баланс клиента:{' '}
                        <span className="font-semibold">
                          {customer.bonusBalance.toLocaleString('ru-RU')} ₸
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr,1.4fr]">
                  {/* Информация о клиенте + рефералка */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div>
                        <span className="text-xs text-slate-400">Имя: </span>
                        <span className="text-sm font-medium">
                          {order.customerName}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">
                          Телефон:{' '}
                        </span>
                        <span className="text-sm">
                          {order.customerPhone}
                        </span>
                      </div>
                      {order.customerAddress && (
                        <div>
                          <span className="text-xs text-slate-400">
                            Адрес:{' '}
                          </span>
                          <span className="text-sm">
                            {order.customerAddress}
                          </span>
                        </div>
                      )}
                      {order.deliveryTime && (
                        <div>
                          <span className="text-xs text-slate-400">
                            Дата и время доставки:{' '}
                          </span>
                          <span className="text-sm font-medium">
                            {formatDeliveryTime(order.deliveryTime)}
                          </span>
                        </div>
                      )}
                      {order.comment && (
                        <div>
                          <span className="text-xs text-slate-400">
                            Комментарий:{' '}
                          </span>
                          <span className="text-sm">{order.comment}</span>
                        </div>
                      )}
                    </div>

                    {customer && (
                      <div className="rounded-xl bg-rose-50/70 px-3 py-2 text-[11px] text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Реферальная информация
                          </span>
                          <span className="text-rose-500">
                            {customer.referralCode}
                          </span>
                        </div>
                        {inviter ? (
                          <div className="mt-1 text-[11px]">
                            <div>
                              Пригласитель:{' '}
                              <span className="font-medium">
                                {inviter.name || inviter.phone}
                              </span>
                            </div>
                            {inviterBonusForOrder !== 0 && (
                              <div>
                                Бонус пригласителю за заказ:{' '}
                                <span className="font-semibold text-emerald-600">
                                  {inviterBonusForOrder.toLocaleString(
                                    'ru-RU',
                                  )}{' '}
                                  ₸
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Клиент без пригласителя (прямой заход).
                          </div>
                        )}
                        {customerBonusForOrder !== 0 && (
                          <div className="mt-1 text-[11px]">
                            Бонус клиента за этот заказ:{' '}
                            <span className="font-semibold text-emerald-600">
                              {customerBonusForOrder.toLocaleString('ru-RU')} ₸
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Товары */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500">
                      Товары
                    </div>
                    <ul className="space-y-1.5">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {item.product?.name ?? `ID ${item.productId}`}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.priceAtMoment.toLocaleString('ru-RU')} ₸ ×{' '}
                              {item.quantity}
                            </div>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800">
                            {item.subtotal.toLocaleString('ru-RU')} ₸
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}







