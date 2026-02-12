/**
 * Хранилище для отслеживания попыток админ-логина
 * 
 * ⚠️ ВАЖНО: Это решение для MVP на одном сервере (in-memory только для MVP).
 * 
 * Ограничения in-memory хранилища:
 * - При перезапуске сервера все блокировки сбрасываются
 * - При деплое на несколько инстансов (или serverless) один инстанс "не увидит" блокировки другого
 * - Лимиты по IP/логину тоже станут "дырявыми" при горизонтальном масштабировании
 * 
 * ✅ Для продакшена ОБЯЗАТЕЛЬНО нужно использовать:
 * - Redis (рекомендуется) - для распределённого хранения с TTL
 * - PostgreSQL/MySQL - для персистентного хранения в БД
 * 
 * Задача на прод: заменить на Redis/DB (иначе блокировки/лимиты сбрасываются и обходятся)
 */
interface LoginAttempt {
  attempts: number;
  blockedUntil?: number;
  lastAttemptAt: number;
}

const loginAttempts = new Map<string, LoginAttempt>(); // login -> attempts
const ipAttempts = new Map<string, LoginAttempt>(); // IP -> attempts

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 минут

// Очистка старых записей
function cleanup() {
  const now = Date.now();
  
  for (const [key, value] of loginAttempts.entries()) {
    if (value.blockedUntil && now > value.blockedUntil) {
      loginAttempts.delete(key);
    } else if (!value.blockedUntil && now - value.lastAttemptAt > 60 * 60 * 1000) {
      // Удаляем неудачные попытки старше часа
      loginAttempts.delete(key);
    }
  }
  
  for (const [key, value] of ipAttempts.entries()) {
    if (value.blockedUntil && now > value.blockedUntil) {
      ipAttempts.delete(key);
    } else if (!value.blockedUntil && now - value.lastAttemptAt > 60 * 60 * 1000) {
      ipAttempts.delete(key);
    }
  }
}

export function recordFailedAttempt(login: string, ip: string): { blocked: boolean; unblockAt?: number } {
  cleanup();
  
  // Записываем попытку для логина
  let loginRecord = loginAttempts.get(login);
  if (!loginRecord) {
    loginRecord = { attempts: 0, lastAttemptAt: Date.now() };
  }
  loginRecord.attempts += 1;
  loginRecord.lastAttemptAt = Date.now();
  
  // Если превышен лимит - блокируем
  if (loginRecord.attempts >= MAX_ATTEMPTS) {
    loginRecord.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }
  loginAttempts.set(login, loginRecord);
  
  // Записываем попытку для IP
  let ipRecord = ipAttempts.get(ip);
  if (!ipRecord) {
    ipRecord = { attempts: 0, lastAttemptAt: Date.now() };
  }
  ipRecord.attempts += 1;
  ipRecord.lastAttemptAt = Date.now();
  
  if (ipRecord.attempts >= MAX_ATTEMPTS) {
    ipRecord.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }
  ipAttempts.set(ip, ipRecord);
  
  // Проверяем блокировку
  if (loginRecord.blockedUntil && Date.now() < loginRecord.blockedUntil) {
    return { blocked: true, unblockAt: loginRecord.blockedUntil };
  }
  
  if (ipRecord.blockedUntil && Date.now() < ipRecord.blockedUntil) {
    return { blocked: true, unblockAt: ipRecord.blockedUntil };
  }
  
  return { blocked: false };
}

export function checkBlocked(login: string, ip: string): { blocked: boolean; unblockAt?: number } {
  cleanup();
  
  const loginRecord = loginAttempts.get(login);
  if (loginRecord?.blockedUntil && Date.now() < loginRecord.blockedUntil) {
    return { blocked: true, unblockAt: loginRecord.blockedUntil };
  }
  
  const ipRecord = ipAttempts.get(ip);
  if (ipRecord?.blockedUntil && Date.now() < ipRecord.blockedUntil) {
    return { blocked: true, unblockAt: ipRecord.blockedUntil };
  }
  
  return { blocked: false };
}

export function clearAttempts(login: string, ip: string): void {
  loginAttempts.delete(login);
  ipAttempts.delete(ip);
}

export function getRemainingAttempts(login: string, ip: string): number {
  cleanup();
  
  const loginRecord = loginAttempts.get(login);
  const ipRecord = ipAttempts.get(ip);
  
  const loginAttemptsCount = loginRecord?.attempts || 0;
  const ipAttemptsCount = ipRecord?.attempts || 0;
  
  // Возвращаем минимум оставшихся попыток
  const loginRemaining = Math.max(0, MAX_ATTEMPTS - loginAttemptsCount);
  const ipRemaining = Math.max(0, MAX_ATTEMPTS - ipAttemptsCount);
  
  return Math.min(loginRemaining, ipRemaining);
}
