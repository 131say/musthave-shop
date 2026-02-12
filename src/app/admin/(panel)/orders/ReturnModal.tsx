'use client';

import { useState, useEffect } from 'react';

type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  returnedQuantity: number;
  priceAtMoment: number;
  subtotal: number;
  product?: {
    name: string;
  } | null;
};

type ReturnModalProps = {
  orderId: number;
  items: OrderItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ReturnModal({ orderId, items, isOpen, onClose, onSuccess }: ReturnModalProps) {
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Инициализируем состояние для каждого товара
      const initial: Record<number, number> = {};
      items.forEach((item) => {
        const available = item.quantity - (item.returnedQuantity || 0);
        initial[item.id] = 0;
      });
      setReturnQuantities(initial);
      setError(null);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleQuantityChange = (itemId: number, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const available = item.quantity - (item.returnedQuantity || 0);
    const clamped = Math.max(0, Math.min(numValue, available));
    setReturnQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleSubmit = async () => {
    const returns = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        itemId: parseInt(itemId, 10),
        quantity: qty,
      }));

    if (returns.length === 0) {
      setError('Выберите товары для возврата');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          returns,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(data?.error || 'Ошибка возврата товаров');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ошибка возврата товаров');
    } finally {
      setLoading(false);
    }
  };

  const totalReturnAmount = items.reduce((sum, item) => {
    const qty = returnQuantities[item.id] || 0;
    return sum + item.priceAtMoment * qty;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-slate-200 p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold dark:text-white">Возврат товаров</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-neutral-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {items.map((item) => {
              const available = item.quantity - (item.returnedQuantity || 0);
              const returnQty = returnQuantities[item.id] || 0;

              if (available <= 0) {
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-800"
                  >
                    <div className="font-medium dark:text-white">{item.product?.name ?? `Товар #${item.productId}`}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      Все товары уже возвращены ({item.quantity} из {item.quantity})
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium dark:text-white">{item.product?.name ?? `Товар #${item.productId}`}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                        Куплено: {item.quantity} шт. × {item.priceAtMoment.toLocaleString('ru-RU')} ₸
                        {item.returnedQuantity > 0 && (
                          <span className="ml-2 text-rose-600 dark:text-rose-400">
                            (возвращено: {item.returnedQuantity} шт.)
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                        Доступно для возврата: {available} шт.
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={available}
                        value={returnQty}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      />
                      <span className="text-xs text-slate-500 dark:text-gray-400">шт.</span>
                    </div>
                  </div>
                  {returnQty > 0 && (
                    <div className="mt-2 text-right text-xs text-slate-600 dark:text-gray-300">
                      Сумма возврата: {(item.priceAtMoment * returnQty).toLocaleString('ru-RU')} ₸
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalReturnAmount > 0 && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Общая сумма возврата: {totalReturnAmount.toLocaleString('ru-RU')} ₸
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-neutral-800">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || totalReturnAmount === 0}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Обработка...' : 'Оформить возврат'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

