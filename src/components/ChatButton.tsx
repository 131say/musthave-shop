"use client";

import { useState, useEffect } from "react";

interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export default function ChatButton({ onClick, unreadCount = 0 }: ChatButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Показываем чат только вверху страницы или при скролле вверх
      // На странице корзины скрываем при скролле вниз
      const isCartPage = window.location.pathname === "/cart";
      
      if (isCartPage) {
        // На корзине скрываем при скролле вниз, показываем при скролле вверх
        setIsVisible(currentScrollY < 100 || currentScrollY < lastScrollY);
      } else {
        // На других страницах показываем вверху или при скролле вверх
        setIsVisible(currentScrollY < 100 || currentScrollY < lastScrollY);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-24 sm:bottom-6 sm:right-[7.5rem] z-50 flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2.5 sm:px-5 sm:py-3 text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95"
      aria-label="Открыть чат с поддержкой"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
      <span className="font-medium">Чат</span>
      {unreadCount > 0 && (
        <span className="inline-flex min-w-[24px] items-center justify-center rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-blue-500">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

