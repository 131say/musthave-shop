/**
 * Временное in-memory хранилище OTP кодов
 * 
 * ⚠️ ВАЖНО: Это решение для MVP на одном сервере (in-memory только для MVP).
 * 
 * В режиме development используется файловое хранилище (.next/cache/otp-store.json),
 * чтобы все воркеры Next.js видели одни и те же коды (иначе send и verify в разных процессах дают "Код не найден").
 * 
 * Ограничения in-memory хранилища:
 * - При перезапуске сервера все коды пропадают
 * - При деплое на несколько инстансов (или serverless) один инстанс "не увидит" код, созданный другим
 * - Лимиты по IP/дню тоже станут "дырявыми" при горизонтальном масштабировании
 * 
 * ✅ Для продакшена ОБЯЗАТЕЛЬНО нужно использовать:
 * - Redis (рекомендуется) - для распределённого хранения с TTL
 * - PostgreSQL/MySQL - для персистентного хранения в БД
 * 
 * Задача на прод: заменить на Redis/DB (иначе блокировки/лимиты сбрасываются и обходятся)
 * 
 * Миграция: заменить все вызовы функций из этого файла на аналогичные из lib/otp-store-redis.ts (или БД)
 */
import fs from "fs";
import path from "path";

interface OTPData {
  code: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
  lastSentAt: number;
  blockedUntil?: number; // Время блокировки после 5 неверных попыток
}

const otpStore = new Map<string, OTPData>();
const dailySmsCount = new Map<string, { count: number; resetAt: number }>(); // phone -> { count, resetAt }
const ipRequests = new Map<string, { count: number; resetAt: number }>(); // IP -> { count, resetAt }

const isDev = process.env.NODE_ENV === "development";

function getOtpFilePath(): string {
  return path.join(process.cwd(), ".next", "cache", "otp-store.json");
}

function loadOtpStoreFromFile(): void {
  if (!isDev) return;
  try {
    const filePath = getOtpFilePath();
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, OTPData>;
    const now = Date.now();
    otpStore.clear();
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value.expiresAt === "number" && value.expiresAt > now) {
        otpStore.set(key, value);
      }
    }
  } catch {
    // игнорируем ошибки чтения (файл не создан, битый JSON и т.д.)
  }
}

function saveOtpStoreToFile(): void {
  if (!isDev) return;
  try {
    const filePath = getOtpFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, OTPData> = {};
    for (const [key, value] of otpStore.entries()) {
      obj[key] = value;
    }
    fs.writeFileSync(filePath, JSON.stringify(obj), "utf-8");
  } catch {
    // игнорируем ошибки записи
  }
}

export function getOTP(phone: string): OTPData | undefined {
  if (isDev) loadOtpStoreFromFile();
  cleanupExpiredCodes();
  return otpStore.get(phone);
}

export function setOTP(phone: string, code: string, expiresAt: number): void {
  // При создании нового кода сбрасываем attempts и блокировку
  otpStore.set(phone, {
    code,
    expiresAt,
    attempts: 0,
    used: false,
    lastSentAt: Date.now(),
    blockedUntil: undefined,
  });
  if (isDev) saveOtpStoreToFile();
}

// Блокировка номера после 5 неверных попыток
export function blockPhone(phone: string, blockDurationMs: number = 10 * 60 * 1000): void {
  const data = otpStore.get(phone);
  if (data) {
    data.blockedUntil = Date.now() + blockDurationMs; // Блокируем на 10 минут
  }
  if (isDev) saveOtpStoreToFile();
}

// Проверка, заблокирован ли номер
export function isPhoneBlocked(phone: string): { blocked: boolean; unblockAt?: number } {
  const data = otpStore.get(phone);
  if (!data?.blockedUntil) return { blocked: false };
  
  if (Date.now() < data.blockedUntil) {
    return { blocked: true, unblockAt: data.blockedUntil };
  }
  
  // Блокировка истекла, снимаем её
  data.blockedUntil = undefined;
  return { blocked: false };
}

export function deleteOTP(phone: string): void {
  otpStore.delete(phone);
  if (isDev) saveOtpStoreToFile();
}

export function incrementAttempts(phone: string): number {
  const data = otpStore.get(phone);
  if (!data) return 0;
  data.attempts += 1;
  if (isDev) saveOtpStoreToFile();
  return data.attempts;
}

export function markAsUsed(phone: string): void {
  const data = otpStore.get(phone);
  if (data) {
    data.used = true;
  }
  if (isDev) saveOtpStoreToFile();
}

export function getLastSentAt(phone: string): number | null {
  const data = otpStore.get(phone);
  return data?.lastSentAt ?? null;
}

// Проверка cooldown (60 секунд)
export function canSendSms(phone: string): { can: boolean; waitSeconds?: number } {
  const lastSent = getLastSentAt(phone);
  if (!lastSent) return { can: true };
  
  const elapsed = Date.now() - lastSent;
  const cooldownMs = 60 * 1000; // 60 секунд
  
  if (elapsed < cooldownMs) {
    return { can: false, waitSeconds: Math.ceil((cooldownMs - elapsed) / 1000) };
  }
  
  return { can: true };
}

// Проверка daily limit (5 SMS в день)
export function checkDailyLimit(phone: string, maxPerDay: number = 5): { allowed: boolean; remaining?: number } {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  let record = dailySmsCount.get(phone);
  
  // Сбрасываем счётчик, если прошёл день
  if (record && now > record.resetAt) {
    record = undefined;
    dailySmsCount.delete(phone);
  }
  
  if (!record) {
    dailySmsCount.set(phone, { count: 0, resetAt: now + dayMs });
    return { allowed: true, remaining: maxPerDay };
  }
  
  if (record.count >= maxPerDay) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count += 1;
  return { allowed: true, remaining: maxPerDay - record.count };
}

// Проверка IP limit (20 запросов в час)
export function checkIpLimit(ip: string, maxPerHour: number = 20): { allowed: boolean; remaining?: number } {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  
  let record = ipRequests.get(ip);
  
  // Сбрасываем счётчик, если прошёл час
  if (record && now > record.resetAt) {
    record = undefined;
    ipRequests.delete(ip);
  }
  
  if (!record) {
    ipRequests.set(ip, { count: 0, resetAt: now + hourMs });
    return { allowed: true, remaining: maxPerHour };
  }
  
  if (record.count >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count += 1;
  return { allowed: true, remaining: maxPerHour - record.count };
}

// Маскировка телефона для логов (последние 4 цифры)
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "****";
  const last4 = phone.slice(-4);
  return `****${last4}`;
}

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    // Удаляем истёкшие, использованные коды и разблокированные номера
    const isExpired = value.expiresAt < now;
    const isUsed = value.used;
    const isBlockExpired = value.blockedUntil && now > value.blockedUntil;
    
    if (isExpired || (isUsed && !value.blockedUntil) || (isBlockExpired && isUsed)) {
      otpStore.delete(key);
    }
  }
  
  // Очистка старых daily/IP записей
  for (const [key, value] of dailySmsCount.entries()) {
    if (now > value.resetAt) {
      dailySmsCount.delete(key);
    }
  }
  
  for (const [key, value] of ipRequests.entries()) {
    if (now > value.resetAt) {
      ipRequests.delete(key);
    }
  }
}
