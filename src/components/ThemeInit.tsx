"use client";

import { useEffect } from "react";

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
}

export default function ThemeInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
      applyTheme(saved === "dark" ? "dark" : "light");
    } catch {
      // ignore
    }
  }, []);

  return null;
}

