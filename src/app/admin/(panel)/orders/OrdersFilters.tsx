'use client';

import { useState } from 'react';

export function OrdersFilters({
  initialPhone,
  initialStatus,
  initialFrom,
  initialTo,
  onSearchChange,
}: {
  initialPhone: string;
  initialStatus: string;
  initialFrom: string;
  initialTo: string;
  onSearchChange?: (q: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
            {onSearchChange ? 'Поиск (id / имя / телефон / логин)' : 'Телефон'}
          </div>
          {onSearchChange ? (
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Поиск: id / имя / телефон / логин..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-gray-500 dark:focus:ring-rose-900"
            />
          ) : (
            <form action="/admin/orders" className="mt-1">
              <input type="hidden" name="status" value={initialStatus} />
              <input type="hidden" name="from" value={initialFrom} />
              <input type="hidden" name="to" value={initialTo} />
              <input
                name="phone"
                defaultValue={initialPhone}
                placeholder="Поиск по телефону"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-gray-500 dark:focus:ring-rose-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
            </form>
          )}
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Статус</div>
          <form action="/admin/orders" className="mt-1">
            <input type="hidden" name="phone" value={initialPhone} />
            <input type="hidden" name="from" value={initialFrom} />
            <input type="hidden" name="to" value={initialTo} />
            <select
              name="status"
              defaultValue={initialStatus || 'ALL'}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
              onChange={(e) => {
                e.currentTarget.form?.requestSubmit();
              }}
            >
              <option value="ALL">Все</option>
              <option value="NEW">NEW</option>
              <option value="WORKING">WORKING</option>
              <option value="PAID">PAID</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DONE">DONE</option>
              <option value="CANCEL">CANCEL</option>
            </select>
          </form>
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Дата от</div>
          <form action="/admin/orders" className="mt-1">
            <input type="hidden" name="phone" value={initialPhone} />
            <input type="hidden" name="status" value={initialStatus} />
            <input type="hidden" name="to" value={initialTo} />
            <input
              name="from"
              type="date"
              defaultValue={initialFrom}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
              onChange={(e) => {
                e.currentTarget.form?.requestSubmit();
              }}
            />
          </form>
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-gray-400">Дата до</div>
          <form action="/admin/orders" className="mt-1">
            <input type="hidden" name="phone" value={initialPhone} />
            <input type="hidden" name="status" value={initialStatus} />
            <input type="hidden" name="from" value={initialFrom} />
            <input
              name="to"
              type="date"
              defaultValue={initialTo}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
              onChange={(e) => {
                e.currentTarget.form?.requestSubmit();
              }}
            />
          </form>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <a
          href="/admin/orders"
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Сбросить фильтры
        </a>
        <div className="text-xs text-slate-500 dark:text-gray-400">
          Фильтры применяются автоматически (статус/даты) или по Enter (телефон)
        </div>
      </div>
    </div>
  );
}






