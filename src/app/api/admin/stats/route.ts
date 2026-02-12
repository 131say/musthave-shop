import { NextResponse } from 'next/server';
import { getStats } from '@/lib/stats';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') || 14)));

    const stats = await getStats(days);
    return NextResponse.json(stats);
  } catch (e) {
    console.error('stats error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}






