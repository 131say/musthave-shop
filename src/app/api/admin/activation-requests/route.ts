import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    // Получаем всех пользователей, которые запросили активацию, но доступ еще не включен
    // Используем прямой SQL для обхода проблем с типизацией Prisma
    const usersRaw = await prisma.$queryRaw<any[]>`
      SELECT id, login, phone, name, referralCode, createdAt, referralActivationRequested, referralsEnabled
      FROM User
      WHERE referralActivationRequested = 1 AND referralsEnabled = 0
      ORDER BY createdAt DESC
    `;

    // Преобразуем boolean из SQLite (0/1) в true/false
    const users = usersRaw.map((user: any) => ({
      ...user,
      referralActivationRequested: Boolean(user.referralActivationRequested),
      referralsEnabled: Boolean(user.referralsEnabled),
    }));

    return NextResponse.json({ ok: true, requests: users });
  } catch (e) {
    console.error("GET /api/admin/activation-requests error", e);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

