"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ChatButton from "./ChatButton";
import ChatModal from "./ChatModal";

export default function ChatWidget() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Скрываем чат только на чекауте, чтобы не мешать оформлению заказа
  const isCheckoutPage = pathname?.startsWith("/checkout");

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

  // Проверяем непрочитанные каждые 30 секунд (снижаем нагрузку на БД и Vercel)
  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // При закрытии модалки обновляем счетчик
  const handleClose = () => {
    setIsModalOpen(false);
    checkUnread();
  };

  // Не показываем чат только на чекауте
  if (isCheckoutPage) {
    return null;
  }

  return (
    <>
      <ChatButton onClick={() => setIsModalOpen(true)} unreadCount={unreadCount} />
      <ChatModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  );
}

