"use client";

import { useEffect, useState } from "react";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    login: string | null;
  };
};

type Props = {
  productId: number;
};

export default function ProductReviews({ productId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [userOrders, setUserOrders] = useState<Array<{ id: number; createdAt: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    checkCanReview();
  }, [productId]);

  async function loadReviews() {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error("Failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  }

  async function checkCanReview() {
    try {
      // Проверяем, есть ли у пользователя заказы со статусом DONE с этим товаром
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => null);
      if (!meData?.authed || !meData?.user?.id) {
        setCanReview(false);
        return;
      }

      const ordersRes = await fetch(`/api/orders?userId=${encodeURIComponent(String(meData.user.id))}`);
      const ordersData = await ordersRes.json().catch(() => null);
      if (ordersData?.ok && ordersData.orders) {
        const doneOrders = ordersData.orders.filter(
          (o: any) => o.status === "DONE" && o.items?.some((item: any) => item.productId === productId)
        );
        setUserOrders(doneOrders);
        setCanReview(doneOrders.length > 0);
      }
    } catch (e) {
      console.error("Failed to check can review:", e);
    }
  }

  async function submitReview() {
    if (rating < 1 || rating > 5) {
      setError("Оценка должна быть от 1 до 5");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
          orderId: selectedOrderId || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMsg = data?.error || data?.details || "Ошибка при отправке отзыва";
        setError(errorMsg);
        console.error("Review submission error:", data);
        return;
      }

      // Обновляем список отзывов
      await loadReviews();
      setShowForm(false);
      setComment("");
      setRating(5);
      setSelectedOrderId(null);
    } catch (e) {
      setError("Ошибка при отправке отзыва");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold dark:text-white">Отзывы</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Загрузка...</p>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Скрываем блок полностью, если нет отзывов
  if (reviews.length === 0 && !canReview) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl border bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold dark:text-white">Отзывы</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {avgRating.toFixed(1)} ⭐ ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {canReview && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
        >
          Оставить отзыв
        </button>
      )}

      {showForm && (
        <div className="mt-4 rounded-xl border p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="font-medium dark:text-white">Ваш отзыв</h3>
          {userOrders.length > 1 && (
            <div className="mt-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">Выберите заказ:</label>
              <select
                value={selectedOrderId || ""}
                onChange={(e) => setSelectedOrderId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              >
                <option value="">Любой заказ</option>
                {userOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    Заказ #{order.id} от {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-3">
            <label className="text-sm text-gray-600 dark:text-gray-300">Оценка:</label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRating(star);
                  }}
                  onMouseEnter={() => {
                    // При наведении можно подсвечивать звезды
                  }}
                  className={`cursor-pointer text-2xl transition-all hover:scale-110 ${
                    star <= rating ? "text-yellow-400" : "text-gray-300"
                  }`}
                  aria-label={`Оценить ${star} из 5`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Выбрано: {rating} из 5</div>
          </div>
          <div className="mt-3">
            <label className="text-sm text-gray-600 dark:text-gray-300">Комментарий (необязательно):</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              rows={3}
              placeholder="Расскажите о товаре..."
            />
          </div>
          {error && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={submitReview}
              disabled={submitting}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {submitting ? "Отправка..." : "Отправить"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        // Скрываем блок, если нет отзывов
        null
      ) : (
        <div className="mt-4 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium dark:text-white">
                    {review.user.name || review.user.login || "Пользователь"}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= review.rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

