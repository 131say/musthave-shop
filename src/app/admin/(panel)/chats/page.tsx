"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Message {
  id: number;
  text: string;
  isFromAdmin: boolean;
  createdAt: string;
}

interface Chat {
  id: number;
  userId: number;
  userName: string;
  userPhone: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка списка чатов
  const loadChats = async () => {
    try {
      const res = await fetch("/api/support/chats");
      const data = await res.json();
      if (data.ok && data.chats) {
        setChats(data.chats);
      }
    } catch (e) {
      console.error("Failed to load chats:", e);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка сообщений чата
  const loadMessages = async (chatId: number) => {
    try {
      const res = await fetch(`/api/support/messages?chatId=${chatId}`);
      const data = await res.json();
      if (data.ok && data.messages) {
        setMessages(data.messages);
        // Обновляем список чатов, чтобы обновить счетчик непрочитанных
        await loadChats();
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!selectedChatId || !inputText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChatId, text: inputText.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputText("");
        await loadChats(); // Обновляем список чатов
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  // При выборе чата загружаем сообщения
  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId]);

  // Загрузка чатов при монтировании
  useEffect(() => {
    loadChats();
    const interval = setInterval(() => {
      loadChats();
      if (selectedChatId) {
        loadMessages(selectedChatId);
      }
    }, 3000); // Обновляем каждые 3 секунды

    return () => clearInterval(interval);
  }, [selectedChatId]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;
    return formatTime(dateString);
  };

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Чаты поддержки</h1>

      <div className="grid h-[calc(100vh-200px)] grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Список чатов */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <div className="border-b border-slate-200 p-4 dark:border-neutral-700">
            <h2 className="font-semibold dark:text-white">Активные чаты</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {chats.filter((c) => c.unreadCount > 0).length} с непрочитанными
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-gray-400">Загрузка...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-gray-400">Нет активных чатов</div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800 ${
                    selectedChatId === chat.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium dark:text-white">{chat.userName}</p>
                        {chat.unreadCount > 0 && (
                          <span className="flex-shrink-0 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                          </span>
                        )}
                      </div>
                      {chat.userPhone && (
                        <p className="text-xs text-slate-500 dark:text-gray-400">{chat.userPhone}</p>
                      )}
                      {chat.lastMessage && (
                        <p className="mt-1 truncate text-sm text-slate-600 dark:text-gray-300">
                          {chat.lastMessage.text}
                        </p>
                      )}
                    </div>
                    <p className="flex-shrink-0 text-xs text-slate-400 dark:text-gray-500">
                      {formatRelativeTime(chat.updatedAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Область сообщений */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          {selectedChat ? (
            <>
              {/* Заголовок чата */}
              <div className="border-b border-slate-200 p-4 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold dark:text-white">{selectedChat.userName}</h2>
                    {selectedChat.userPhone && (
                      <p className="text-sm text-slate-500 dark:text-gray-400">{selectedChat.userPhone}</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/users/${selectedChat.userId}`}
                    className="rounded-lg px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Профиль
                  </Link>
                </div>
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-slate-500 dark:text-gray-400">
                      <p>Сообщений пока нет</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          msg.isFromAdmin
                            ? "bg-blue-500 text-white"
                            : "bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-white"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        <p
                          className={`mt-1 text-xs ${
                            msg.isFromAdmin ? "text-blue-100" : "text-slate-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="border-t border-slate-200 p-4 dark:border-neutral-700">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Напишите ответ..."
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-400"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {sending ? (
                      <svg
                        className="h-5 w-5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
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
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-slate-500 dark:text-gray-400">
                <p className="text-lg font-medium">Выберите чат</p>
                <p className="mt-2 text-sm">Выберите чат из списка слева, чтобы начать переписку</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

