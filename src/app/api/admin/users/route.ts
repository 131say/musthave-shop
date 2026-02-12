import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        login: true,
        phone: true,
        name: true,
        referralCode: true,
        slotsTotal: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, users });
  } catch (e) {
    console.error('admin/users GET error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}





