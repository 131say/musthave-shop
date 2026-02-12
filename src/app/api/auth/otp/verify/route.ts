import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOTP, deleteOTP, incrementAttempts, markAsUsed, blockPhone, isPhoneBlocked, maskPhone } from "@/lib/otp-store";

// Получаем IP адрес из запроса
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return ip;
}

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const startTime = Date.now();
  
  try {
    const body = await req.json().catch(() => null);
    const phone = body?.phone ? String(body.phone).trim().replace(/\D/g, "") : null;
    const code = body?.code ? String(body.code).trim() : null;
    const refCode = body?.ref ? String(body.ref).trim() : null; // Реферальный код из клиента (может быть из localStorage)

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Укажите корректный номер телефона" },
        { status: 400 }
      );
    }

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { ok: false, error: "Укажите 6-значный код" },
        { status: 400 }
      );
    }

    // Проверяем, не заблокирован ли номер после 5 неверных попыток
    const blockCheck = isPhoneBlocked(phone);
    if (blockCheck.blocked) {
      const maskedPhone = maskPhone(phone);
      const unblockIn = Math.ceil((blockCheck.unblockAt! - Date.now()) / 1000 / 60);
      console.log(`[OTP VERIFY] Phone blocked for ${maskedPhone} (IP: ${clientIp}) - unblock in ${unblockIn} min`);
      return NextResponse.json(
        { ok: false, error: `Номер заблокирован после 5 неверных попыток. Попробуйте через ${unblockIn} минут.` },
        { status: 429 }
      );
    }

    // Проверяем код (связка phone + code)
    const stored = getOTP(phone);
    if (!stored) {
      const maskedPhone = maskPhone(phone);
      console.log(`[OTP VERIFY] Code not found for ${maskedPhone} (IP: ${clientIp})`);
      return NextResponse.json(
        { ok: false, error: "Код не найден. Запросите новый код." },
        { status: 400 }
      );
    }

    // Проверяем, не использован ли код
    if (stored.used) {
      const maskedPhone = maskPhone(phone);
      console.log(`[OTP VERIFY] Code already used for ${maskedPhone} (IP: ${clientIp})`);
      return NextResponse.json(
        { ok: false, error: "Код уже использован. Запросите новый код." },
        { status: 400 }
      );
    }

    // Проверяем TTL
    if (Date.now() > stored.expiresAt) {
      deleteOTP(phone);
      const maskedPhone = maskPhone(phone);
      console.log(`[OTP VERIFY] Code expired for ${maskedPhone} (IP: ${clientIp})`);
      return NextResponse.json(
        { ok: false, error: "Код истёк. Запросите новый код." },
        { status: 400 }
      );
    }

    // Проверяем лимит попыток (максимум 5) - привязан к phone
    const attempts = incrementAttempts(phone);
    
    // Проверяем код (связка phone + code)
    if (stored.code !== code) {
      const remaining = 5 - attempts;
      const maskedPhone = maskPhone(phone);
      console.log(`[OTP VERIFY] Invalid code attempt ${attempts}/5 for ${maskedPhone} (IP: ${clientIp})`);
      
      // Если превышен лимит попыток - блокируем номер на 10 минут
      if (attempts >= 5) {
        blockPhone(phone, 10 * 60 * 1000); // 10 минут
        deleteOTP(phone);
        console.log(`[OTP VERIFY] Max attempts exceeded, phone blocked: ${maskedPhone} (IP: ${clientIp})`);
        return NextResponse.json(
          { ok: false, error: "Превышено количество попыток. Номер заблокирован на 10 минут." },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { ok: false, error: `Неверный код. Осталось попыток: ${remaining}` },
        { status: 400 }
      );
    }

    // Код верный - помечаем как использованный и удаляем
    markAsUsed(phone);
    deleteOTP(phone);

    // Находим или создаём пользователя (SMS-OTP = логин И регистрация одновременно)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { login: phone },
        ],
      },
    });

    // Если пользователя нет - создаём его автоматически
    if (!user) {
      // Находим реферера по коду, если указан (из localStorage или из body)
      let referredByUserId: number | null = null;
      if (refCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: refCode },
          select: { id: true },
        });
        if (referrer) {
          referredByUserId = referrer.id;
        }
      }

      // Генерируем уникальный referralCode
      const last = await prisma.user.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      const nextNum = (last?.id ?? 0) + 1000;
      const referralCode = `SAY${nextNum}`;

      user = await prisma.user.create({
        data: {
          login: phone, // телефон как логин
          phone: phone,
          name: null,
          address: null,
          role: "CUSTOMER",
          referralCode,
          bonusBalance: 0,
          slotsTotal: 1,
          passwordHash: null, // без пароля, вход только по OTP
          referredByUserId, // Привязываем к рефереру, если refCode был указан
        } as any,
      });

      const maskedPhone = maskPhone(phone);
      console.log(`[OTP VERIFY] New user created: ${user.id} for ${maskedPhone} (IP: ${clientIp})${referredByUserId ? `, referred by user ${referredByUserId}` : ""}`);
    } else {
      // Пользователь уже существует — привязка только один раз и только если inviter ещё не установлен
      if (user.referredByUserId != null) {
        // Уже привязан — ref игнорируем (защита от перепривязки)
        // ничего не делаем
      } else if (refCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: refCode },
          select: { id: true },
        });
        if (referrer && referrer.id !== user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { referredByUserId: referrer.id },
          });
          const maskedPhone = maskPhone(phone);
          console.log(`[OTP VERIFY] Existing user ${user.id} (${maskedPhone}) bound to referrer ${referrer.id}`);
        }
      }
    }

    // Автоматически логиним пользователя
    const c = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    c.set("sb_userId", String(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    });
    c.set("sb_role", user.role || "CUSTOMER", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    });

    const duration = Date.now() - startTime;
    const maskedPhone = maskPhone(phone);
    console.log(`[OTP VERIFY] Success: user ${user.id} (${maskedPhone}) logged in via OTP (IP: ${clientIp}, ${duration}ms)`);

    return NextResponse.json({
      ok: true,
      userId: user.id,
      role: user.role || "CUSTOMER",
    });
  } catch (e: any) {
    console.error(`[OTP VERIFY] Error (IP: ${clientIp}):`, e);
    // В проде не логируем детали ошибки
    return NextResponse.json(
      { ok: false, error: "Ошибка проверки кода" },
      { status: 500 }
    );
  }
}
