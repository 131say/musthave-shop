import Link from 'next/link';
import { getStats } from '@/lib/stats';

type Stats = Awaited<ReturnType<typeof getStats>>;

function fmt(n: number) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function riskBadge(ratio: number) {
  const r = Number.isFinite(ratio) ? ratio : 0;
  if (r > 1) return { label: "DANGER", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" };
  if (r >= 0.5) return { label: "RISK", cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" };
  return { label: "OK", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
}

export const dynamic = 'force-dynamic';

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.max(7, Math.min(365, Number(sp?.days || 30)));
  const s: Stats = await getStats(days);

  const rb = riskBadge(s.reserveRatio);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Аналитика</h1>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/stats?days=${d}`}
              className={`rounded-xl px-3 py-2 text-sm ${
                d === days
                  ? 'bg-rose-500 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300 dark:hover:bg-neutral-800'
              }`}
            >
              {d}д
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Cash In</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.cashIn)} ₸</div>
          <div className="mt-2 text-xs text-black/50 dark:text-gray-500">Сумма оплат деньгами (без CANCELLED)</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Bonus Paid</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{fmt(s.bonusPaid)} ₸</div>
          <div className="mt-2 text-xs text-black/50 dark:text-gray-500">Сумма оплат бонусами (без CANCELLED)</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Reserve Needed</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.reserveNeeded)} ₸</div>
          <div className="mt-2 text-xs text-black/50 dark:text-gray-500">Текущий суммарный баланс бонусов пользователей</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black/60 dark:text-gray-400">Risk</div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rb.cls}`}>{rb.label}</span>
          </div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{(s.reserveRatio * 100).toFixed(0)}%</div>
          <div className="mt-2 text-xs text-black/50 dark:text-gray-500">Reserve / Cash In</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Reserved Cash</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.reservedCash)} ₸</div>
          <div className="mt-2 text-xs text-black/50 dark:text-gray-500">
            {s.reservePercent}% от Cash In (настройка резерва)
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Reserve Gap</div>
          <div className={`mt-1 text-2xl font-semibold ${s.reserveGap >= 0 ? "text-green-700 dark:text-green-400" : "text-rose-700 dark:text-rose-400"}`}>
            {s.reserveGap >= 0 ? "+" : ""}
            {fmt(s.reserveGap)} ₸
          </div>
          <div className="mt-2 text-xs text-black/50 dark:text-gray-500">
            Reserved Cash − Reserve Needed
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Оборот (Revenue)</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.revenue)} ₸</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Себестоимость (COGS)</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.cogs)} ₸</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Валовая прибыль (Gross)</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.grossProfit)} ₸</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Начислено бонусов</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.bonusesIssued)} ₸</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Заказы</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{s.ordersCount}</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
          <div className="text-xs text-black/60 dark:text-gray-400">Чистая прибыль (Net)</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">{fmt(s.netProfit)} ₸</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border dark:border-neutral-700">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-black/60 dark:text-gray-400">Рекомендации</div>
            <div className="mt-1 text-base font-semibold dark:text-white">Экономика и риск</div>
          </div>
          <div className={`text-xs rounded-full px-3 py-1 border ${
            s.reserveGap < 0 ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300" :
            s.reserveGap === 0 ? "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
            "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
          }`}>
            {s.reserveGap < 0 ? "DANGER" : s.reserveGap === 0 ? "RISK" : "OK"}
          </div>
        </div>

        <div className="mt-3 text-sm text-black/80 dark:text-gray-300">
          {s.hints?.riskHint}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-neutral-800">
            <div className="text-black/70 dark:text-gray-300">Кэшбэк клиенту</div>
            <div className="font-semibold dark:text-white">{s.settings.customerPercent}%</div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-neutral-800">
            <div className="text-black/70 dark:text-gray-300">Бонус пригласителю</div>
            <div className="font-semibold dark:text-white">{s.settings.inviterPercent}%</div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-neutral-800">
            <div className="text-black/70 dark:text-gray-300">Оплата бонусами до 100%</div>
            <div className="font-semibold dark:text-white">{s.settings.allowFullBonusPay ? "Да" : "Нет"}</div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-neutral-800">
            <div className="text-black/70 dark:text-gray-300">Резерв (%)</div>
            <div className="font-semibold dark:text-white">{s.settings.reservePercent}%</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-black/50 dark:text-gray-500">
          Подсказка: если Reserve Gap уходит в минус — снижай проценты или повышай резерв, и бонусами не давай оплачивать.
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold dark:text-white">Оборот по дням</div>
          <div className="text-xs text-slate-500 dark:text-gray-400">за последние {days} дней</div>
        </div>

        <div className="mt-4 space-y-2">
          {s.daily.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-gray-400">Нет данных за период.</div>
          ) : (
            (() => {
              const maxRevenue = Math.max(1, ...s.daily.map((x) => x.revenue));
              return s.daily.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-500 dark:text-gray-400">{d.date}</div>
                  <div className="h-3 flex-1 rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div
                      className="h-3 rounded-full bg-rose-400"
                      style={{ width: `${Math.round((d.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                  <div className="w-28 text-right text-xs text-slate-700 dark:text-gray-300">
                    {fmt(d.revenue)} ₸
                  </div>
                  <div className="w-16 text-right text-xs text-slate-500 dark:text-gray-400">{d.orders} шт</div>
                </div>
              ));
            })()
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500 dark:text-gray-400">
          Примечание: если у товара себестоимость = 0, прибыль будет завышена.
        </div>
      </div>
    </div>
  );
}


