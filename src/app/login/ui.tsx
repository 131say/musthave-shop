"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearCart } from "@/lib/cart";
import Link from "next/link";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = useMemo(() => sp.get("next") ?? "/", [sp]);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const loginVal = String(login ?? "").trim();
    const passwordVal = String(password ?? "");
    if (!loginVal || !passwordVal) {
      setError("Введите логин и пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginVal, password: passwordVal }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Неверный логин или пароль");
      }
      const newUserId = String(data.userId || "");
      const role = String(data.role ?? "").toUpperCase();
      const lastUserId = typeof window !== "undefined" ? localStorage.getItem("musthave_lastUserId") : null;
      if (lastUserId && lastUserId !== newUserId) clearCart();
      if (typeof window !== "undefined") localStorage.setItem("musthave_lastUserId", newUserId);
      if (role === "ADMIN") {
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (nextUrl && nextUrl !== "/" && nextUrl !== "/account") {
        router.replace(nextUrl);
      } else if (nextUrl === "/account") {
        if (typeof window !== "undefined") sessionStorage.setItem("justLoggedIn", "true");
        router.replace("/account");
      } else {
        router.replace("/catalog");
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-white px-4 pb-20 md:pb-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-4 text-xl font-semibold">Вход</h1>
          {error && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
          )}
          <input
            type="text"
            value={login}
            onChange={(e) => { setLogin(e.target.value); setError(null); }}
            className="mb-3 w-full rounded-xl border px-4 py-3"
            placeholder="Логин"
            required
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            className="mb-4 w-full rounded-xl border px-4 py-3"
            placeholder="Пароль"
            required
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-600 px-4 py-3 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-gray-600">
              Нет аккаунта?{" "}
              <Link href={nextUrl ? `/register?next=${encodeURIComponent(nextUrl)}` : "/register"} className="text-amber-600 hover:underline">
                Зарегистрироваться
              </Link>
            </p>
            <Link
              href="/catalog"
              className="mt-2 block text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Продолжить без входа
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
