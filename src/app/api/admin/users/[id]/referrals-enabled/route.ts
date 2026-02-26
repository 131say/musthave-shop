import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    const { id: idStr } = await ctx.params;
    const userId = Number(idStr);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ ok: false, error: "Некорректный id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const { enabled } = (body || {}) as { enabled?: boolean };

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "enabled должен быть boolean" },
        { status: 400 },
      );
    }

    // Проверяем пользователя через прямой SQL для обхода проблем с типизацией Prisma
    const users = await prisma.$queryRaw<any[]>`
      SELECT id 
      FROM "User" 
      WHERE id = ${userId}
    `;
    
    if (!users || users.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Пользователь не найден" },
        { status: 404 },
      );
    }

    // Обновляем через прямой SQL для обхода проблем с типизацией Prisma
    if (enabled) {
      // Если включаем доступ, сбрасываем флаг запроса
      await prisma.$executeRaw`UPDATE "User" SET "referralsEnabled" = true, "referralActivationRequested" = false WHERE id = ${userId}`;
    } else {
      // Если выключаем доступ, оставляем флаг запроса без изменений
      await prisma.$executeRaw`UPDATE "User" SET "referralsEnabled" = false WHERE id = ${userId}`;
    }

    // Получаем обновленные данные
    const updatedRaw = await prisma.$queryRaw<any[]>`
      SELECT id, "referralsEnabled", "referralActivationRequested"
      FROM "User" 
      WHERE id = ${userId}
    `;
    
    const updated = updatedRaw[0] ? {
      id: updatedRaw[0].id,
      referralsEnabled: Boolean(updatedRaw[0].referralsEnabled),
      referralActivationRequested: Boolean(updatedRaw[0].referralActivationRequested),
    } : null;

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("POST /api/admin/users/[id]/referrals-enabled error", e);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

