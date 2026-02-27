const TELEGRAM_API = "https://api.telegram.org/bot";

export type OrderPayload = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  bonusSpent?: number;
  comment?: string | null;
  deliveryTime?: string | null;
  itemsSummary?: string;
};

async function sendMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token?.trim()) {
    console.log("[TELEGRAM] TELEGRAM_BOT_TOKEN not set, skip.");
    return false;
  }
  const targetChatId = process.env.TELEGRAM_ORDER_CHAT_ID?.trim();
  if (!targetChatId) {
    console.log("[TELEGRAM] TELEGRAM_ORDER_CHAT_ID not set, skip.");
    return false;
  }

  const url = `${TELEGRAM_API}${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error("[TELEGRAM] sendMessage failed:", data.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[TELEGRAM] sendMessage error:", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Отправляет заявку о новом заказе в Telegram-канал.
 */
export async function sendOrderToChannel(order: OrderPayload): Promise<boolean> {
  const chatId = process.env.TELEGRAM_ORDER_CHAT_ID?.trim();
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN?.trim()) return false;

  const lines: string[] = [
    "🛒 <b>Новый заказ</b>",
    "",
    `№ <b>${order.id}</b>`,
    `👤 ${escapeHtml(order.customerName)}`,
    `📞 ${escapeHtml(order.customerPhone)}`,
    `📍 ${escapeHtml(order.customerAddress)}`,
    "",
    `💰 Сумма: <b>${order.totalAmount.toLocaleString("ru-RU")} ₸</b>`,
  ];

  if (order.bonusSpent && order.bonusSpent > 0) {
    lines.push(`💎 Бонусами: ${order.bonusSpent.toLocaleString("ru-RU")} ₸`);
  }
  if (order.deliveryTime) {
    lines.push(`🕐 Время доставки: ${escapeHtml(order.deliveryTime)}`);
  }
  if (order.comment) {
    lines.push(`💬 Комментарий: ${escapeHtml(order.comment)}`);
  }
  if (order.itemsSummary) {
    lines.push("", "📦 Состав:", escapeHtml(order.itemsSummary));
  }

  const text = lines.join("\n");
  return sendMessage(chatId, text);
}

/**
 * Отправляет уведомление о новом сообщении в чате поддержки.
 * Нужны: TELEGRAM_BOT_TOKEN, TELEGRAM_SUPPORT_CHAT_ID.
 */
export async function sendSupportChatNotification(params: {
  supportChatId: number;
  text: string;
  userName?: string | null;
  userPhone?: string | null;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID?.trim();

  if (!token) {
    console.log("[TELEGRAM] TELEGRAM_BOT_TOKEN not set, skip support notification.");
    return false;
  }
  if (!chatId) {
    console.log("[TELEGRAM] TELEGRAM_SUPPORT_CHAT_ID not set, skip support notification.");
    return false;
  }

  const lines: string[] = [
    "💬 <b>Новое сообщение в чате поддержки</b>",
    "",
    `Чат #<b>${params.supportChatId}</b>`,
  ];

  const displayName =
    params.userName && params.userName.trim()
      ? params.userName
      : params.userPhone && params.userPhone.trim()
      ? params.userPhone
      : null;

  if (displayName) {
    lines.push(`👤 ${escapeHtml(displayName)}`);
  }

  lines.push("", `💭 ${escapeHtml(params.text)}`);

  const body = {
    chat_id: chatId,
    text: lines.join("\n"),
    parse_mode: "HTML" as const,
    disable_web_page_preview: true,
  };

  const url = `${TELEGRAM_API}${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error("[TELEGRAM] sendSupportChatNotification failed:", data.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[TELEGRAM] sendSupportChatNotification error:", e);
    return false;
  }
}
