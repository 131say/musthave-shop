'use client';

import { useState } from 'react';

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);

  // Маппинг статусов БД в значения для селектора
  const statusToSelectValue = (status: string): string => {
    if (status === 'PROCESSING') return 'PROCESSING';
    if (status === 'CANCELLED') return 'CANCELLED';
    return status;
  };

  // Получаем текущее значение для селектора
  const currentSelectValue = statusToSelectValue(currentStatus);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as string;

    if (newStatus === currentStatus) return;

    setLoading(true);
    try {
      const res = await fetch('/api/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(data?.error || 'Ошибка обновления статуса');
      }

      // Обновляем страницу для отображения нового статуса
      window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'Ошибка обновления статуса');
      // Возвращаем старое значение при ошибке
      e.target.value = currentSelectValue;
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={currentSelectValue}
      onChange={handleChange}
      disabled={loading}
      className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
    >
      <option value="NEW">Принят</option>
      <option value="PROCESSING">В работе</option>
      <option value="PAID">Оплачен</option>
      <option value="SHIPPED">Отправлен</option>
      <option value="DONE">Выполнен</option>
      <option value="CANCELLED">Отменён</option>
    </select>
  );
}







