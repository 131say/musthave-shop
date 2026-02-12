import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

// GET /api/support/chats
// Для пользователя: возвращает его текущий активный чат (или создает новый)
// Для админа: возвращает список всех активных чатов
export async function GET() {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json({ ok: false, error: "Database connection error" }, { status: 500 });
    }

    // Проверяем, что модель supportChat доступна
    if (!prisma.supportChat) {
      console.error("Prisma model supportChat is not available. Try restarting the dev server.");
      return NextResponse.json({ ok: false, error: "Database model not available" }, { status: 500 });
    }

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = await isAdmin();

    if (admin) {
      // Админ видит все активные чаты с последним сообщением
      const chats = await prisma.supportChat.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              login: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              text: true,
              isFromAdmin: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: { isRead: false, isFromAdmin: false }, // непрочитанные сообщения от пользователя
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json({
        ok: true,
        chats: chats.map((chat) => ({
          id: chat.id,
          userId: chat.userId,
          userName: chat.user.name || chat.user.phone || chat.user.login || `User #${chat.user.id}`,
          userPhone: chat.user.phone,
          lastMessage: chat.messages[0] || null,
          unreadCount: chat._count.messages,
          updatedAt: chat.updatedAt,
          createdAt: chat.createdAt,
        })),
      });
    } else {
      // Проверяем существование пользователя
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        console.error(`User ${userId} not found`);
        return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
      }

      // Пользователь видит свой чат или создает новый
      let chat = await prisma.supportChat.findFirst({
        where: {
          userId,
          isActive: true,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              text: true,
              isFromAdmin: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: { isRead: false, isFromAdmin: true }, // непрочитанные сообщения от админа
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!chat) {
        // Создаем новый чат для пользователя
        try {
          chat = await prisma.supportChat.create({
            data: {
              userId,
              isActive: true,
            },
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  text: true,
                  isFromAdmin: true,
                  createdAt: true,
                },
              },
              _count: {
                select: {
                  messages: {
                    where: { isRead: false, isFromAdmin: true },
                  },
                },
              },
            },
          });
        } catch (createError: any) {
          console.error("Failed to create chat:", createError);
          console.error("User ID:", userId);
          console.error("Error code:", createError?.code);
          console.error("Error meta:", createError?.meta);
          throw createError;
        }
      }

      return NextResponse.json({
        ok: true,
        chat: {
          id: chat.id,
          messages: chat.messages,
          unreadCount: chat._count.messages,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        },
      });
    }
  } catch (e: any) {
    console.error("GET /api/support/chats error", e);
    console.error("Error details:", e?.message, e?.stack);
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === "development" ? e?.message : undefined
    }, { status: 500 });
  }
}

// POST /api/support/chats
// Создание нового чата (только для пользователей)
export async function POST() {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json({ ok: false, error: "Database connection error" }, { status: 500 });
    }

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      console.error(`User ${userId} not found`);
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Проверяем, есть ли уже активный чат
    const existingChat = await prisma.supportChat.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (existingChat) {
      return NextResponse.json({
        ok: true,
        chat: { id: existingChat.id },
        message: "Активный чат уже существует",
      });
    }

    // Создаем новый чат
    try {
      const chat = await prisma.supportChat.create({
        data: {
          userId,
          isActive: true,
        },
      });

      return NextResponse.json({
        ok: true,
        chat: { id: chat.id },
      });
    } catch (createError: any) {
      console.error("Failed to create chat in POST:", createError);
      console.error("User ID:", userId);
      console.error("Error code:", createError?.code);
      console.error("Error meta:", createError?.meta);
      throw createError;
    }
  } catch (e: any) {
    console.error("POST /api/support/chats error", e);
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === "development" ? e?.message : undefined
    }, { status: 500 });
  }
}

