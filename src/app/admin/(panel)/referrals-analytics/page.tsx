"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type AnalyticsData = {
  period: { days: number; from: string };
  totals: {
    cashback: number;
    l1: number;
    l2: number;
    other: number;
    all: number;
  };
  l1VsL2: {
    l1Amount: number;
    l2Amount: number;
    l1Orders: number;
    l2Orders: number;
  };
  topReferrers: Array<{
    userId: number;
    email: string | null;
    name: string | null;
    phone: string | null;
    ordersCount: number;
    turnoverCashPaid: number;
    bonusTotal: number;
    l1Bonus: number;
    l2Bonus: number;
  }>;
  timeline: Array<{
    date: string;
    cashback: number;
    l1: number;
    l2: number;
    other: number;
  }>;
};

export default function ReferralsAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/referrals/analytics?days=${days}&top=20`);
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  const formatMoney = (n: number) => {
    return new Intl.NumberFormat("ru-KZ", {
      style: "currency",
      currency: "KZT",
      minimumFractionDigits: 0,
    }).format(n);
  };

  const formatTg = (v: number) => {
    const n = Number(v) || 0;
    return new Intl.NumberFormat("ru-RU").format(Math.round(n));
  };

  const formatPct01 = (v: number) => {
    const n = Number(v) || 0;
    return `${(n * 100).toFixed(2)}%`;
  };

  const exportCsv = () => {
    const url = `/api/admin/referrals/analytics/csv?days=${days}`;
    // открываем в новом окне/вкладке, чтобы браузер скачал файл
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-400">
        Загрузка аналитики...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        {error || "Ошибка загрузки данных"}
      </div>
    );
  }

  const l1Percent = data.totals.all > 0 ? Math.round((data.totals.l1 / data.totals.all) * 100) : 0;
  const l2Percent = data.totals.all > 0 ? Math.round((data.totals.l2 / data.totals.all) * 100) : 0;
  const cashbackPercent =
    data.totals.all > 0 ? Math.round((data.totals.cashback / data.totals.all) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">
          Аналитика рефералов
        </h1>
        <div className="flex gap-2 flex-wrap">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                days === d
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
              }`}
            >
              {d} дней
            </button>
          ))}
          <button
            onClick={exportCsv}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Скачать CSV"
          >
            Экспорт CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Всего выплачено бонусов
          </div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">
            {formatMoney(data.totals.all)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Кэшбэк</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">
            {formatMoney(data.totals.cashback)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {cashbackPercent}% от всех бонусов
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400">L1 (рефереры)</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">
            {formatMoney(data.totals.l1)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {l1Percent}% от всех бонусов
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-xs font-medium text-slate-500 dark:text-gray-400">L2 (2-й уровень)</div>
          <div className="mt-1 text-2xl font-semibold dark:text-white">
            {formatMoney(data.totals.l2)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {l2Percent}% от всех бонусов
          </div>
        </div>
      </div>

      {/* KPI: Оборот и стоимость бонусов */}
      {data && data.turnover && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Оборот (cashPaid)
            </div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
              {formatTg(data.turnover.totalCashPaid)} ₸
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Всего бонусов
            </div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
              {formatTg(data.totals.all)} ₸
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Стоимость бонусов от оборота
            </div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
              {formatPct01(data.turnover.bonusCostRate)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Формула расчета
            </div>
            <div className="mt-1 text-xs dark:text-white">
              <span className="font-mono">totals.all / turnover.cashPaid</span>
            </div>
          </div>
        </div>
      )}

      {/* L1 vs L2 Stats */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="text-sm font-semibold mb-4 dark:text-white">L1 vs L2</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500 dark:text-gray-400">L1 бонусы</div>
            <div className="mt-1 text-xl font-semibold dark:text-white">
              {formatMoney(data.l1VsL2.l1Amount)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
              {data.l1VsL2.l1Orders} заказов
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-gray-400">L2 бонусы</div>
            <div className="mt-1 text-xl font-semibold dark:text-white">
              {formatMoney(data.l1VsL2.l2Amount)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
              {data.l1VsL2.l2Orders} заказов
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      {data.timeline.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-sm font-semibold mb-4 dark:text-white">Динамика по дням</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatMoney(value)}
                labelStyle={{ color: "#000" }}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
              />
              <Legend />
              <Bar dataKey="cashback" stackId="a" fill="#f59e0b" name="Кэшбэк" />
              <Bar dataKey="l1" stackId="a" fill="#3b82f6" name="L1" />
              <Bar dataKey="l2" stackId="a" fill="#10b981" name="L2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Referrers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-neutral-700">
          <div className="text-sm font-semibold dark:text-white">Топ рефереров</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400">
                  Телефон
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400">
                  Заказов
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400">
                  Оборот (cashPaid)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400">
                  L1 бонус
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400">
                  L2 бонус
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400">
                  Всего бонусов
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-neutral-700">
              {data.topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                    Нет данных
                  </td>
                </tr>
              ) : (
                data.topReferrers.map((ref) => (
                  <tr key={ref.userId} className="hover:bg-slate-50 dark:hover:bg-neutral-800">
                    <td className="px-4 py-3 text-sm dark:text-white">
                      {ref.phone || ref.email || `User #${ref.userId}`}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-white">{ref.ordersCount}</td>
                    <td className="px-4 py-3 text-sm text-right dark:text-white">
                      {formatMoney(ref.turnoverCashPaid)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right dark:text-white">
                      {formatMoney(ref.l1Bonus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right dark:text-white">
                      {formatMoney(ref.l2Bonus)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right dark:text-white">
                      {formatMoney(ref.bonusTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
