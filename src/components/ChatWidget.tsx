"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ChatButton from "./ChatButton";
import ChatModal from "./ChatModal";

export default function ChatWidget() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Скрываем чат на каталоге, странице товара, чекауте, избранном и кабинете (чтобы не мешал просмотру)
  const isCatalogPage = pathname === "/catalog" || pathname?.startsWith("/catalog");
  const isProductPage = pathname?.startsWith("/product/");
  const isCheckoutPage = pathname?.startsWith("/checkout");
  const isFavoritesPage = pathname === "/favorites";
  const isAccountPage = pathname === "/account" || pathname?.startsWith("/account/");

  // Проверка непрочитанных сообщений
  const checkUnread = async () => {
    try {
      const res = await fetch("/api/support/chats");
      const data = await res.json();
      if (data.ok && data.chat) {
        setUnreadCount(data.chat.unreadCount || 0);
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  };

  // Проверяем непрочитанные каждые 10 секунд
  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  // При закрытии модалки обновляем счетчик
  const handleClose = () => {
    setIsModalOpen(false);
    checkUnread();
  };

  // Не показываем чат на каталоге, странице товара, чекауте, избранном и кабинете (включая /account/orders/…)
  if (isCatalogPage || isProductPage || isCheckoutPage || isFavoritesPage || isAccountPage) {
    return null;
  }

  return (
    <>
      <ChatButton onClick={() => setIsModalOpen(true)} unreadCount={unreadCount} />
      <ChatModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  );
}

