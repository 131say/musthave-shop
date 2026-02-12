'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ActivationRequest = {
  id: number;
  login: string | null;
  phone: string | null;
  name: string | null;
  referralCode: string;
  createdAt: string;
  referralActivationRequested: boolean;
  referralsEnabled: boolean;
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<number | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/activation-requests', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки запросов');
      setRequests(data.requests || []);
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const activateAccess = async (userId: number) => {
    try {
      setActivating(userId);
      const res = await fetch(`/api/admin/users/${userId}/referrals-enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      await loadRequests();
      alert('Доступ к реферальной программе включен');
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setActivating(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ru-RU');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Запросы на активацию реферальной программы</h2>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center dark:bg-neutral-900 dark:border-neutral-800">
          <p className="text-slate-500 dark:text-gray-400">Загрузка запросов...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-red-700 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-200">
          <p>Ошибка: {error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center dark:bg-neutral-900 dark:border-neutral-800">
          <p className="text-slate-500 dark:text-gray-400">Нет запросов на активацию</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-gray-400">
                    Пользователь
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-gray-400">
                    Реферальный код
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-gray-400">
                    Дата запроса
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-gray-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/users/${req.id}`}
                          className="text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
                        >
                          {req.name || req.login || req.phone || `Пользователь #${req.id}`}
                        </Link>
                        {req.phone && (
                          <span className="text-xs text-slate-500 dark:text-gray-400">{req.phone}</span>
                        )}
                        {req.login && (
                          <span className="text-xs text-slate-500 dark:text-gray-400">@{req.login}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-slate-700 dark:text-gray-300">
                        {req.referralCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 dark:text-gray-400">
                        {formatDate(req.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/users/${req.id}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                        >
                          Профиль
                        </Link>
                        <button
                          onClick={() => activateAccess(req.id)}
                          disabled={activating === req.id}
                          className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {activating === req.id ? 'Активация...' : 'Включить доступ'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


