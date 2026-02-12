import { NextResponse } from 'next/server';
import { getUserTree } from '@/lib/userTree';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }

    const url = new URL(req.url);
    const depth = Math.max(1, Math.min(5, Number(url.searchParams.get('depth') || 3)));
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') || 30)));

    const tree = await getUserTree(userId, depth, days);
    if (!tree) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tree });
  } catch (e) {
    console.error('user tree api error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}







