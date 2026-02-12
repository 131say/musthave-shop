import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function normalizeLogin(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { login, password, name, ref } = (body || {}) as {
      login?: string;
      password?: string;
      name?: string;
      ref?: string;
    };

    if (!login || !password) {
      return NextResponse.json(
        { ok: false, error: "Логин и пароль обязательны" },
        { status: 400 }
      );
    }

    const loginNormalized = normalizeLogin(login);
    if (!loginNormalized) {
      return NextResponse.json(
        { ok: false, error: "Логин не может быть пустым" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { ok: false, error: "Пароль должен быть не менее 4 символов" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь с таким login
    const existsByLogin = await prisma.user.findUnique({
      where: { login: loginNormalized },
      select: { id: true },
    });

    if (existsByLogin) {
      return NextResponse.json(
        { ok: false, error: "Пользователь с таким логином уже существует" },
        { status: 400 }
      );
    }

    // Находим пользователя по реферальному коду, если указан
    let referredByUserId: number | null = null;
    if (ref && ref.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: ref.trim() },
        select: { id: true },
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Создаём пользователя с генерацией referralCode
    const created = await prisma.$transaction(async (tx) => {
      const last = await tx.user.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      const nextNum = (last?.id ?? 0) + 1000;
      const referralCode = `SAY${nextNum}`;

      return tx.user.create({
        data: {
          login: loginNormalized,
          name: name?.trim() || null,
          role: "CUSTOMER",
          referralCode,
          bonusBalance: 0,
          slotsTotal: 1,
          passwordHash,
          referredByUserId,
        } as any,
      });
    });

    // Автоматически логиним пользователя после регистрации
    const c = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    c.set("sb_userId", String(created.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    });
    c.set("sb_role", "CUSTOMER", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    });

    return NextResponse.json({
      ok: true,
      userId: created.id,
      role: "CUSTOMER",
    });
  } catch (e: any) {
    console.error("POST /api/auth/register error", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: "Внутренняя ошибка сервера",
        details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
      },
      { status: 500 }
    );
  }
}

