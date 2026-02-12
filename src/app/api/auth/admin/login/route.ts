import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  checkBlocked,
  recordFailedAttempt,
  clearAttempts,
  getRemainingAttempts,
} from "@/lib/admin-login-store";

// Получаем IP адрес из запроса
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return ip;
}

// Маскировка логина для логов
function maskLogin(login: string): string {
  if (!login || login.length < 3) return "***";
  return `${login.substring(0, 2)}***`;
}

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => null);
    const login = body?.login ? String(body.login).trim().toLowerCase() : "";
    const password = String(body?.password ?? "");

    // Валидация
    if (!login || !password) {
      return NextResponse.json(
        { ok: false, error: "Логин и пароль обязательны" },
        { status: 400 }
      );
    }

    // Проверка минимальной длины пароля
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    // Проверяем блокировку перед проверкой пароля
    const blockCheck = checkBlocked(login, clientIp);
    if (blockCheck.blocked) {
      const unblockIn = Math.ceil((blockCheck.unblockAt! - Date.now()) / 1000 / 60);
      const maskedLogin = maskLogin(login);
      console.log(
        `[ADMIN LOGIN] Blocked attempt for ${maskedLogin} (IP: ${clientIp}) - unblock in ${unblockIn} min`
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Превышено количество попыток. Попробуйте через ${unblockIn} минут.`,
        },
        { status: 429 }
      );
    }

    // Ищем пользователя только по login (не по phone)
    const user = await prisma.user.findUnique({
      where: { login },
    });

    // Всегда проверяем пароль, даже если пользователь не найден (чтобы не палить существование)
    let passwordValid = false;
    if (user) {
      const anyUser: any = user;
      const storedHash = String(anyUser.passwordHash ?? "");
      const storedPlain = String(anyUser.password ?? ""); // если где-то осталось

      if (storedHash) {
        passwordValid = await bcrypt.compare(password, storedHash);
      } else if (storedPlain) {
        passwordValid = storedPlain === password;
      }
    } else {
      // Имитируем проверку пароля для несуществующего пользователя (защита от timing attack)
      await bcrypt.compare(password, "$2a$10$dummyhashfordummyuserprotection");
    }

    // Проверяем роль (только ADMIN)
    const role = user ? String((user as any).role ?? "").trim().toUpperCase() : "";
    const isAdmin = role === "ADMIN";

    // Если пароль неверный или пользователь не админ - записываем неудачную попытку
    if (!passwordValid || !isAdmin || !user) {
      const attemptResult = recordFailedAttempt(login, clientIp);
      const remaining = getRemainingAttempts(login, clientIp);
      const maskedLogin = maskLogin(login);

      console.log(
        `[ADMIN LOGIN] Failed attempt for ${maskedLogin} (IP: ${clientIp}) - ${remaining} attempts remaining`
      );

      // Если заблокировали после этой попытки
      if (attemptResult.blocked) {
        const unblockIn = Math.ceil((attemptResult.unblockAt! - Date.now()) / 1000 / 60);
        return NextResponse.json(
          {
            ok: false,
            error: `Превышено количество попыток. Попробуйте через ${unblockIn} минут.`,
          },
          { status: 429 }
        );
      }

      // Всегда одинаковый ответ, чтобы не палить существование пользователя
      return NextResponse.json(
        {
          ok: false,
          error: `Неверный логин или пароль. Осталось попыток: ${remaining}`,
        },
        { status: 401 }
      );
    }

    // Успешный вход - очищаем попытки
    clearAttempts(login, clientIp);

    // Устанавливаем cookies
    const c = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    c.set("sb_userId", String(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    });
    c.set("sb_role", "ADMIN", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    });

    const duration = Date.now() - startTime;
    const maskedLogin = maskLogin(login);
    console.log(
      `[ADMIN LOGIN] Success: user ${user.id} (${maskedLogin}) logged in (IP: ${clientIp}, ${duration}ms)`
    );

    return NextResponse.json({
      ok: true,
      userId: user.id,
      role: "ADMIN",
    });
  } catch (e: any) {
    console.error(`[ADMIN LOGIN] Error (IP: ${clientIp}):`, e);
    return NextResponse.json(
      { ok: false, error: "Ошибка входа" },
      { status: 500 }
    );
  }
}
