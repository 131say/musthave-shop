import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendSupportChatNotification } from "@/lib/telegram";

async function getUserIdFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  const role = c.get("sb_role")?.value ?? "";
  return role === "ADMIN";
}

// GET /api/support/messages?chatId=123
// Получение сообщений чата
export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const chatIdRaw = url.searchParams.get("chatId");
    const chatId = chatIdRaw ? Number(chatIdRaw) : null;

    if (!chatId || !Number.isFinite(chatId)) {
      return NextResponse.json({ ok: false, error: "chatId required" }, { status: 400 });
    }

    const admin = await isAdmin();

    // Проверяем доступ к чату
    const chat = await prisma.supportChat.findUnique({
      where: { id: chatId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            login: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ ok: false, error: "Chat not found" }, { status: 404 });
    }

    // Пользователь может видеть только свой чат, админ - любой
    if (!admin && chat.userId !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Получаем сообщения
    const messages = await prisma.supportMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        text: true,
        isFromAdmin: true,
        createdAt: true,
      },
    });

    // Если это пользователь, помечаем сообщения от админа как прочитанные
    if (!admin) {
      await prisma.supportMessage.updateMany({
        where: {
          chatId,
          isFromAdmin: true,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    }

    // Если это админ, помечаем сообщения от пользователя как прочитанные
    if (admin) {
      await prisma.supportMessage.updateMany({
        where: {
          chatId,
          isFromAdmin: false,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      messages,
    });
  } catch (e) {
    console.error("GET /api/support/messages error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// POST /api/support/messages
// Отправка сообщения
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const chatId = Number(body?.chatId);
    const text = String(body?.text ?? "").trim();

    if (!Number.isFinite(chatId) || chatId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid chatId" }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ ok: false, error: "Text is required" }, { status: 400 });
    }

    const admin = await isAdmin();

    // Проверяем доступ к чату
    const chat = await prisma.supportChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ ok: false, error: "Chat not found" }, { status: 404 });
    }

    // Пользователь может писать только в свой чат, админ - в любой
    if (!admin && chat.userId !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Создаем сообщение
    const message = await prisma.supportMessage.create({
      data: {
        chatId,
        text,
        isFromAdmin: admin,
        isRead: false,
      },
    });

    // Обновляем время последнего обновления чата
    await prisma.supportChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Отправляем уведомление в Telegram только для сообщений от пользователя
    if (!admin) {
      const userName =
        chat.user.name ||
        chat.user.login ||
        (chat.user.phone ? `+${chat.user.phone}` : null) ||
        `User #${chat.user.id}`;

      // Не блокируем основной ответ, если Telegram не отвечает
      sendSupportChatNotification({
        supportChatId: chatId,
        text,
        userName,
        userPhone: chat.user.phone,
      }).catch((e) => {
        console.error("[TELEGRAM] Failed to send support chat notification:", e);
      });
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        text: message.text,
        isFromAdmin: message.isFromAdmin,
        createdAt: message.createdAt,
      },
    });
  } catch (e) {
    console.error("POST /api/support/messages error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

