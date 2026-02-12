"use client";

import { useState, useEffect } from "react";

export default function AddToWishlistButton({
  productId,
}: {
  productId: number;
}) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Проверяем, есть ли товар в избранном
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok && Array.isArray(data.products)) {
          setIsInWishlist(data.products.some((p: any) => p.id === productId));
        }
      } catch (e) {
        console.error("Failed to check wishlist:", e);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [productId]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isInWishlist) {
        // Удаляем из избранного
        const res = await fetch(`/api/wishlist/${productId}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setIsInWishlist(false);
          // Уведомляем об изменении избранного
          window.dispatchEvent(new Event("wishlist:changed"));
        } else {
            alert(data?.error || "Ошибка при удалении из избранного");
          }
        } else {
          // Добавляем в избранное
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setIsInWishlist(true);
          // Уведомляем об изменении избранного
          window.dispatchEvent(new Event("wishlist:changed"));
        } else {
          if (data?.error === "Unauthorized") {
            alert("Войдите в систему, чтобы добавить товар в избранное");
          } else {
            alert(data?.error || "Ошибка при добавлении в избранное");
          }
        }
      }
    } catch (e) {
      alert("Ошибка при работе с избранным");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <button
        disabled
        className="rounded-xl border px-5 py-3 text-sm opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
      >
        ...
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-xl border px-5 py-3 text-sm hover:bg-gray-50 active:scale-95 active:bg-gray-100 transition-all duration-150 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 dark:active:bg-neutral-600 ${
        isInWishlist ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300" : ""
      }`}
      title={isInWishlist ? "Удалить из избранного" : "Добавить в избранное"}
    >
      {loading ? (
        "..."
      ) : isInWishlist ? (
        <span className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="h-5 w-5"
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          В избранном
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          В избранное
        </span>
      )}
    </button>
  );
}

