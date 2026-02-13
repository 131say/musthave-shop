"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function OTPClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  useEffect(() => {
    const url = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
    window.location.replace(url);
  }, [next]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-white px-4">
      <p className="text-gray-500">Перенаправление на страницу входа…</p>
    </main>
  );
}
