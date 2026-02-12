import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }

    const { phone, slotIndex } = body;
    const ownerUserId = userId; // Используем userId из cookie

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ error: "Телефон обязателен" }, { status: 400 });
    }
    if (typeof slotIndex !== "number" || slotIndex < 1) {
      return NextResponse.json({ error: "Некорректный номер слота" }, { status: 400 });
    }

    const phoneTrimmed = phone.trim();

    const owner = await prisma.user.findUnique({
      where: { id: ownerUserId },
      include: { placements: true },
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    // Проверяем, не является ли пользователь блоггером (с включенной реферальной программой)
    if ((owner as any).referralsEnabled === true) {
      return NextResponse.json({ error: "Для блоггеров система слотов отключена" }, { status: 403 });
    }

    if (slotIndex < 1 || slotIndex > owner.slotsTotal) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    const slotBusy = owner.placements.find(p => p.placementSlot === slotIndex);
    if (slotBusy) {
      return NextResponse.json({ error: "Slot already used" }, { status: 400 });
    }

    // Проверяем, существует ли пользователь с таким логином (login уникален)
    const existsByLogin = await prisma.user.findUnique({ where: { login: phoneTrimmed } }).catch(() => null);
    if (existsByLogin) {
      return NextResponse.json({ error: "Пользователь с таким логином уже существует" }, { status: 400 });
    }

    // Проверяем телефон, если он указан (phone может быть null, но если указан - проверяем)
    if (phoneTrimmed) {
      const existsByPhone = await prisma.user.findFirst({ where: { phone: phoneTrimmed } }).catch(() => null);
      if (existsByPhone) {
        return NextResponse.json({ error: "Пользователь с таким телефоном уже существует" }, { status: 400 });
      }
    }

    // CUSTOMER создаётся без пароля - вход только через OTP (WhatsApp)
    const role = "CUSTOMER";
    const passwordHash = null; // CUSTOMER не имеет пароля

    // Генерируем уникальный referralCode
    let referralCode = `SAY${Date.now()}`;
    let codeExists = await prisma.user.findUnique({ where: { referralCode } });
    while (codeExists) {
      referralCode = `SAY${Date.now()}${Math.random().toString(36).substring(2, 5)}`;
      codeExists = await prisma.user.findUnique({ where: { referralCode } });
    }

    // Защита: CUSTOMER не должен иметь пароль
    if (role === "CUSTOMER" && passwordHash !== null) {
      throw new Error("CUSTOMER users must not have passwordHash");
    }

    const newUser = await prisma.user.create({
      data: {
        login: phoneTrimmed, // Используем телефон как логин
        phone: phoneTrimmed,
        passwordHash,
        referralCode,
        referredByUserId: owner.id,
        placementParentId: owner.id,
        placementSlot: slotIndex,
        role,
      },
    });

    return NextResponse.json({ ok: true, user: newUser });
  } catch (e: any) {
    console.error("slots/create-user error:", e);
    // Более детальная обработка ошибок Prisma
    if (e?.code === 'P2002') {
      const field = e?.meta?.target?.[0] || 'поле';
      return NextResponse.json(
        { error: `Пользователь с таким ${field === 'phone' ? 'телефоном' : field === 'login' ? 'логином' : field} уже существует` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { 
        error: "Ошибка при создании пользователя",
        details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
      },
      { status: 500 }
    );
  }
}






