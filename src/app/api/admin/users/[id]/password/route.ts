export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const password = String(body?.password || "");
    if (password.length < 4) return NextResponse.json({ error: "Пароль слишком короткий" }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error", details: e?.message || String(e) }, { status: 500 });
  }
}






