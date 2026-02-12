// src/app/admin/referrals/page.tsx
import Link from 'next/link';
import { getReferrals } from '@/lib/referrals';

function money(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export const dynamic = 'force-dynamic';

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(90, Number(sp.days || 30)));
  const data = await getReferrals(days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Реферальная аналитика</h1>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/referrals?days=${d}`}
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

      <div className="grid gap-3 lg:grid-cols-3">
        <Block
          title="ТОП по приглашениям"
          subtitle="Кто привёл больше всего людей (всего)"
          rows={data.invitedTop.map((x, idx) => ({
            rank: idx + 1,
            a: x.phone,
            b: x.referralCode,
            c: `${x.invitedCount} чел`,
            href: `/admin/users/${x.userId}`,
          }))}
        />
        <Block
          title="ТОП по обороту команды"
          subtitle={`1 уровень, за ${days} дней`}
          rows={data.teamRevenueTop.map((x, idx) => ({
            rank: idx + 1,
            a: x.phone,
            b: x.referralCode,
            c: `${money(x.teamRevenue)} ₸ / ${x.teamOrders} зак`,
            href: `/admin/users/${x.userId}`,
          }))}
        />
        <Block
          title="ТОП по бонусам пригласителя"
          subtitle={`Сумма бонусов (как пригласитель) за ${days} дней`}
          rows={data.inviterBonusTop.map((x, idx) => ({
            rank: idx + 1,
            a: x.phone,
            b: x.referralCode,
            c: `${money(x.inviterBonus)} ₸`,
            href: `/admin/users/${x.userId}`,
          }))}
        />
      </div>

      {/* Расширенная аналитика для выплат инфлюенсерам */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4">
          <div className="text-lg font-semibold dark:text-white">Детальная аналитика для выплат инфлюенсерам</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Период: {days} дней ({new Date(data.from).toLocaleDateString('ru-RU')} - {new Date(data.to).toLocaleDateString('ru-RU')})
          </div>
        </div>

        {data.influencersDetailed.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-600 dark:text-gray-400">Нет данных по инфлюенсерам.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-700">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-gray-300">Инфлюенсер</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Приглашено (всего)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Приглашено (период)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Оборот команды</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Заказов</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Средний чек</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Конверсия</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Бонусы (период)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">Бонусы (всего)</th>
                </tr>
              </thead>
              <tbody>
                {data.influencersDetailed.map((inf) => (
                  <tr
                    key={inf.userId}
                    className="border-b border-slate-100 hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/users/${inf.userId}`}
                        className="font-medium text-rose-600 hover:underline dark:text-rose-400"
                      >
                        {inf.name || inf.phone}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-gray-400">{inf.referralCode}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold dark:text-white">{inf.invitedCount}</td>
                    <td className="px-3 py-3 text-right dark:text-white">{inf.invitedInPeriod}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {money(inf.teamRevenue)} ₸
                    </td>
                    <td className="px-3 py-3 text-right dark:text-white">{inf.teamOrders}</td>
                    <td className="px-3 py-3 text-right dark:text-white">{money(inf.avgOrderValue)} ₸</td>
                    <td className="px-3 py-3 text-right dark:text-white">{inf.conversionRate}%</td>
                    <td className="px-3 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                      {money(inf.inviterBonus)} ₸
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                      {money(inf.totalBonusEarned)} ₸
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ rank: number; a: string; b: string; c: string; href: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="text-sm font-semibold dark:text-white">{title}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">{subtitle}</div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-neutral-700">
        <div className="grid grid-cols-[44px_1fr_90px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-neutral-800 dark:text-gray-300">
          <div>#</div>
          <div>Пользователь</div>
          <div className="text-right">Показатель</div>
        </div>
        {rows.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-600 dark:text-gray-400">Нет данных.</div>
        ) : (
          rows.map((r) => (
            <Link
              key={`${r.rank}-${r.href}`}
              href={r.href}
              className="grid grid-cols-[44px_1fr_90px] items-center gap-2 border-t border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <div className="text-xs text-slate-500 dark:text-gray-400">{r.rank}</div>
              <div className="min-w-0">
                <div className="truncate font-medium dark:text-white">{r.a}</div>
                <div className="truncate text-xs text-rose-600 dark:text-rose-400">{r.b}</div>
              </div>
              <div className="text-right text-xs font-semibold text-slate-700 dark:text-gray-200">{r.c}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}






