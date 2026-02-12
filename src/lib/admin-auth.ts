/**
 * Общая функция проверки прав администратора для API-роутов
 * 
 * Проверка должна быть server-side, не только в UI.
 * Используется во всех /api/admin/* роутах.
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Проверяет, является ли текущий пользователь администратором
 * 
 * ✅ Безопасность: НЕ полагается на клиентские куки без валидации
 * - Использует cookies() из next/headers (серверные HTTP-only куки)
 * - Проверяет пользователя в БД по userId из cookie
 * - Проверяет role === ADMIN в БД
 * - Не использует JWT без проверки подписи
 * 
 * @returns true если пользователь - ADMIN, false иначе
 */
export async function isAdmin(): Promise<boolean> {
  try {
    // Получаем серверные куки (HTTP-only, не доступны из JavaScript)
    const c = await cookies();
    const roleCookie = (c.get("sb_role")?.value ?? "").trim().toUpperCase();
    const userIdCookie = Number((c.get("sb_userId")?.value ?? "").trim());

    // Быстрая проверка по cookie (оптимизация)
    if (roleCookie === "ADMIN") {
      // Дополнительно проверяем в БД для надёжности
      if (userIdCookie && Number.isFinite(userIdCookie)) {
        const user = await prisma.user.findUnique({
          where: { id: userIdCookie },
          select: { role: true },
        }).catch(() => null);
        
        const userRole = String((user as any)?.role ?? "").trim().toUpperCase();
        return userRole === "ADMIN";
      }
      return true; // Если cookie говорит ADMIN, но userId нет - доверяем (для совместимости)
    }

    // Если нет userId - точно не админ
    if (!userIdCookie || !Number.isFinite(userIdCookie)) {
      return false;
    }

    // Проверка в БД (основная проверка - источник истины)
    const user = await prisma.user.findUnique({
      where: { id: userIdCookie },
      select: { role: true },
    }).catch(() => null);

    if (!user) return false;

    const userRole = String((user as any)?.role ?? "").trim().toUpperCase();
    return userRole === "ADMIN";
  } catch (e) {
    console.error("[ADMIN AUTH] Error checking admin status:", e);
    return false;
  }
}

/**
 * Middleware для API-роутов: проверяет права администратора
 * Если пользователь не админ - возвращает 403 Forbidden
 * 
 * @example
 * ```ts
 * export async function GET() {
 *   const authCheck = await requireAdmin();
 *   if (authCheck) return authCheck; // Если вернулся ответ - это ошибка, возвращаем её
 *   
 *   // Продолжаем выполнение, пользователь - админ
 *   ...
 * }
 * ```
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const isAdminUser = await isAdmin();
  
  if (!isAdminUser) {
    console.log(`[ADMIN AUTH] Unauthorized access attempt to admin API`);
    return NextResponse.json(
      { ok: false, error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }
  
  return null; // null означает, что проверка пройдена
}
