"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "musthave_theme";
type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Удаляем оба класса сначала, чтобы избежать конфликтов
  root.classList.remove("dark", "light");
  // Применяем нужный класс
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    // Для светлой темы класс не нужен, но убеждаемся что он удален
    root.classList.remove("dark");
  }
  // Принудительно обновляем стили
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
      const t: Theme = saved === "dark" ? "dark" : "light";
      setTheme(t);
      applyTheme(t);
    } catch {
      // ignore
    }

    // Слушаем изменения в localStorage от других вкладок
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_KEY && e.newValue) {
        const newTheme = (e.newValue as Theme) === "dark" ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggle = () => {
    if (typeof window === "undefined") return;
    try {
      // Читаем актуальное значение из DOM, а не из состояния
      const root = document.documentElement;
      const isDark = root.classList.contains("dark");
      const next: Theme = isDark ? "light" : "dark";
      
      // Сохраняем в localStorage
      localStorage.setItem(THEME_KEY, next);
      
      // Применяем тему
      applyTheme(next);
      
      // Обновляем состояние
      setTheme(next);
      
      // Отправляем событие для синхронизации между компонентами
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    } catch (e) {
      console.error("Failed to toggle theme:", e);
    }
  };

  // Иконка солнца (для светлой темы)
  const SunIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );

  // Иконка луны (для тёмной темы)
  const MoonIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );

  if (!mounted) {
    return (
      <button
        type="button"
        className={[
          "rounded-full border p-2.5",
          "bg-white hover:bg-gray-50",
          "dark:bg-neutral-900 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-800",
          "transition-colors",
          className,
        ].join(" ")}
        aria-label="Toggle theme"
      >
        <SunIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "rounded-full border p-2.5",
        "bg-white hover:bg-gray-50",
        "dark:bg-neutral-900 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-800",
        "transition-colors",
        className,
      ].join(" ")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

