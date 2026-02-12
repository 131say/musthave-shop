import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

async function getId(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isFinite(n)) throw new Error('Bad id');
  return n;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const id = await getId(ctx);
    const post = await prisma.newsPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error('admin/news/[id] GET error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const id = await getId(ctx);
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });

    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const isPublished = Boolean(body.isPublished);
    const pinned = Boolean(body.pinned);

    if (!title) return NextResponse.json({ error: 'title обязателен' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content обязателен' }, { status: 400 });

    const post = await prisma.newsPost.update({
      where: { id },
      data: { title, content, isPublished, pinned },
    });

    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error('admin/news/[id] POST error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const id = await getId(ctx);
    await prisma.newsPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('admin/news/[id] DELETE error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}







