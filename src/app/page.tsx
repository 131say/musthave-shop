"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForbidden, setShowForbidden] = useState(false);

  useEffect(() => {
    const forbidden = searchParams.get("forbidden");
    if (forbidden === "1") {
      setShowForbidden(true);
      // Убираем параметр из URL через 5 секунд и редиректим
      setTimeout(() => {
        router.replace("/catalog");
      }, 5000);
    } else {
      router.replace("/catalog");
    }
  }, [router, searchParams]);

  if (showForbidden) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-white px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-semibold dark:text-white">Нет доступа</h1>
            <p className="text-gray-600 dark:text-gray-300">
              У вас нет доступа к админ-панели
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Перенаправление на каталог...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Перенаправление на каталог...</p>
      </div>
    </main>
  );
}
