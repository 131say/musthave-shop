import { NextResponse } from "next/server";
import { setOTP, canSendSms, checkDailyLimit, checkIpLimit, deleteOTP, maskPhone } from "@/lib/otp-store";
import { sendOtp } from "@/lib/notifications";

// Генерируем 6-значный код
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Получаем IP адрес из запроса
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return ip;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phone = body?.phone ? String(body.phone).trim().replace(/\D/g, "") : null;

    // Валидация телефона
    if (!phone || phone.length < 10) {
      // Всегда одинаковый ответ, чтобы не палить существование пользователя
      return NextResponse.json({
        ok: true,
        message: "Если номер корректный, код отправлен",
      });
    }

    // Проверка cooldown (60 секунд)
    const cooldownCheck = canSendSms(phone);
    if (!cooldownCheck.can) {
      return NextResponse.json({
        ok: false,
        error: `Повторите запрос через ${cooldownCheck.waitSeconds} секунд`,
        waitSeconds: cooldownCheck.waitSeconds,
      }, { status: 429 });
    }

    // Проверка daily limit (5 SMS в день)
    const dailyCheck = checkDailyLimit(phone, 5);
    if (!dailyCheck.allowed) {
      return NextResponse.json({
        ok: false,
        error: "Превышен лимит запросов. Попробуйте завтра.",
      }, { status: 429 });
    }

    // Проверка IP limit (20 запросов в час)
    const clientIp = getClientIp(req);
    const ipCheck = checkIpLimit(clientIp, 20);
    if (!ipCheck.allowed) {
      return NextResponse.json({
        ok: false,
        error: "Слишком много запросов. Попробуйте позже.",
      }, { status: 429 });
    }

    // SMS-OTP = логин И регистрация одновременно
    // Не проверяем существование пользователя - он будет создан при верификации, если его нет

    // При повторной отправке инвалидируем старый код
    deleteOTP(phone);

    // Генерируем новый код
    const code = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 минут

    // Сохраняем новый код
    setOTP(phone, code, expiresAt);

    // Отправляем OTP через WhatsApp
    // Важно: если WhatsApp упал, не ломаем OTP endpoint - код уже сохранён, пользователь может попробовать позже
    try {
      const sent = await sendOtp(phone, code);
      if (!sent) {
        console.error(`[OTP SEND] WhatsApp send failed for ${phone}`);
        // В проде не логируем код
        if (process.env.NODE_ENV === "development") {
          console.error(`[OTP SEND] Code was: ${code}`);
        }
        // Не возвращаем ошибку - код сохранён, пользователь может попробовать позже
      }
    } catch (whatsappError) {
      // Логируем ошибку отправки, но не палим пользователю и не ломаем endpoint
      console.error(`[OTP SEND] WhatsApp send error for ${phone}:`, whatsappError);
      // В проде не логируем код
      if (process.env.NODE_ENV === "development") {
        console.error(`[OTP SEND] Code was: ${code}`);
      }
      // Не возвращаем ошибку - код сохранён, пользователь может попробовать позже
    }

    // Логируем событие (без кода в проде)
    const maskedPhone = maskPhone(phone);
    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP SEND] Code sent to ${phone} (IP: ${clientIp})`);
    } else {
      console.log(`[OTP SEND] Code sent to ${maskedPhone} (IP: ${clientIp})`);
    }

    // Всегда одинаковый ответ, чтобы не палить существование пользователя
    return NextResponse.json({
      ok: true,
      message: "Если номер корректный, код отправлен",
      // В dev режиме возвращаем код для удобства тестирования
      ...(process.env.NODE_ENV === "development" && { devCode: code }),
    });
  } catch (e: any) {
    console.error("POST /api/auth/otp/send error:", e);
    // В проде не логируем детали ошибки
    return NextResponse.json(
      { ok: false, error: "Ошибка отправки кода" },
      { status: 500 }
    );
  }
}
