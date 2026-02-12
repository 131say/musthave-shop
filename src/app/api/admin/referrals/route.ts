import { NextResponse } from 'next/server';
import { getReferrals } from '@/lib/referrals';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') || 30)));
    const data = await getReferrals(days);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error('referrals api error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}







