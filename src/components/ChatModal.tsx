"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: number;
  text: string;
  isFromAdmin: boolean;
  createdAt: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Загрузка чата и сообщений
  const loadChat = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/chats");
      const data = await res.json();
      if (data.ok && data.chat) {
        setChatId(data.chat.id);
        setMessages(data.chat.messages || []);
        setUnreadCount(data.chat.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to load chat:", e);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка сообщений
  const loadMessages = async () => {
    if (!chatId) return;
    try {
      const res = await fetch(`/api/support/messages?chatId=${chatId}`);
      const data = await res.json();
      if (data.ok && data.messages) {
        setMessages(data.messages);
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  };

  // Отправка сообщения
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      // Если чат еще не создан, сначала получаем/создаем его
      let currentChatId = chatId;
      if (!currentChatId) {
        const chatRes = await fetch("/api/support/chats");
        if (!chatRes.ok) {
          const errorData = await chatRes.json().catch(() => ({}));
          console.error("Failed to fetch chat:", errorData);
          throw new Error(errorData.error || `Server error: ${chatRes.status}`);
        }
        const chatData = await chatRes.json();
        if (chatData.ok && chatData.chat) {
          currentChatId = chatData.chat.id;
          setChatId(currentChatId);
          setMessages(chatData.chat.messages || []);
        } else {
          // Создаем новый чат через POST
          const createRes = await fetch("/api/support/chats", {
            method: "POST",
          });
          if (!createRes.ok) {
            const errorData = await createRes.json().catch(() => ({}));
            console.error("Failed to create chat:", errorData);
            throw new Error(errorData.error || `Failed to create chat: ${createRes.status}`);
          }
          const createData = await createRes.json();
          if (createData.ok && createData.chat) {
            currentChatId = createData.chat.id;
            setChatId(currentChatId);
          } else {
            throw new Error(createData.error || "Failed to create chat");
          }
        }
      }

      if (!currentChatId) {
        throw new Error("No chat ID available");
      }

      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: currentChatId, text }),
      });
      const data = await res.json();
      if (data.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputText("");
        // Прокрутка вниз
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (e) {
      console.error("Failed to send message:", e);
      alert("Не удалось отправить сообщение. Попробуйте еще раз.");
    } finally {
      setSending(false);
    }
  };

  // При открытии модалки загружаем чат
  useEffect(() => {
    if (isOpen) {
      loadChat();
    }
  }, [isOpen]);

  // Автообновление сообщений каждые 3 секунды
  useEffect(() => {
    if (!isOpen || !chatId) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chatId]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center sm:p-0">
      <div className="relative flex h-[80vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl dark:bg-neutral-900 sm:h-[600px] sm:rounded-2xl">
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-neutral-700">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">Чат с поддержкой</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">Мы ответим вам в ближайшее время</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-neutral-800"
            aria-label="Закрыть"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Сообщения */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ scrollBehavior: "smooth" }}
        >
          {loading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-slate-500 dark:text-gray-400">Загрузка...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-slate-500 dark:text-gray-400">Пока сообщений нет</p>
                <p className="mt-2 text-sm text-slate-400 dark:text-gray-500">Напишите свой вопрос, и мы ответим вам</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isFromAdmin ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.isFromAdmin
                      ? "bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.isFromAdmin
                        ? "text-slate-500 dark:text-gray-400"
                        : "text-blue-100"
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
              placeholder="Напишите ваш вопрос..."
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
      </div>
    </div>
  );
}

