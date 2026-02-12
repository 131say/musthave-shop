'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type U = {
  id: number;
  phone: string | null;
  name: string | null;
  referralCode: string;
  slotsTotal: number;
};

export default function UsersClient() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setUsers(data.users ?? []);
    } catch {
      // fallback: если нет API списка, просто оставим как есть
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createRootUser = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMsg = data?.error || 'Ошибка';
        const details = data?.details ? `\n\nДетали: ${data.details}` : '';
        console.error('Error creating user:', data);
        throw new Error(errorMsg + details);
      }
      setOpen(false);
      setPhone('');
      setName('');
      await load();
      alert('Пользователь создан. Он сможет войти через код в WhatsApp.');
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Пользователи</h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
        >
          + Создать пользователя
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300">
          <div className="col-span-4">Телефон</div>
          <div className="col-span-3">Имя</div>
          <div className="col-span-3">Код</div>
          <div className="col-span-1 text-right">Слоты</div>
          <div className="col-span-1 text-right">Действия</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-600 dark:text-gray-400">Загрузка...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-slate-600 dark:text-gray-400">Пользователей пока нет.</div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-12 items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-neutral-700"
            >
              <div className="col-span-4 text-sm font-medium dark:text-white">{u.phone || '—'}</div>
              <div className="col-span-3 text-sm text-slate-700 dark:text-gray-300">{u.name || '—'}</div>
              <div className="col-span-3 text-sm text-slate-700 dark:text-gray-300">{u.referralCode}</div>
              <div className="col-span-1 text-right text-sm dark:text-white">{u.slotsTotal}</div>
              <div className="col-span-1 flex justify-end">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
                >
                  Слоты
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow dark:bg-neutral-900 dark:border dark:border-neutral-700">
            <div className="text-lg font-semibold dark:text-white">Создать пользователя</div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Телефон (+7...)</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
                  placeholder="+77011234567"
                />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Имя (необязательно)</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
                />
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              Пользователь войдёт в аккаунт через код в WhatsApp. Пароль не требуется.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
              >
                Отмена
              </button>
              <button
                disabled={saving || !phone.trim()}
                onClick={createRootUser}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-slate-300 dark:disabled:bg-neutral-700"
              >
                {saving ? 'Создаю...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






