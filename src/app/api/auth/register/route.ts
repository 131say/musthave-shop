import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function normalizeLogin(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

/** Генерирует уникальный реферальный код: SAY{база}-{случайный суффикс} */
function generateReferralCode(baseNum: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, "0");
  return `SAY${baseNum}-${randomSuffix}`;
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

    // База для реферального кода: последний id по порядку (orderBy: id desc)
    console.log("[REGISTER] Checking last user id for referralCode...");
    const last = await prisma.user.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const baseNum = (last?.id ?? 0) + 1000;

    const maxAttempts = 5;
    let created: { id: number } | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const referralCode = generateReferralCode(baseNum);
      console.log("[REGISTER] Creating user, attempt", attempt, "referralCode:", referralCode);
      try {
        created = await prisma.user.create({
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
        console.log("[REGISTER] User created, id:", created.id);
        break;
      } catch (createErr: any) {
        if (createErr?.code === "P2002" && attempt < maxAttempts) {
          console.warn("[REGISTER] P2002 referralCode collision, retrying with new code...");
          continue;
        }
        throw createErr;
      }
    }
    if (!created) throw new Error("Failed to create user after retries");

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
    console.error("[REGISTER] Error at register:", e?.message, "code:", e?.code);
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

