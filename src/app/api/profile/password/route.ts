export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function authedUserId() {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const id = Number(v);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function POST(req: Request) {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const oldPassword = String(body?.oldPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!oldPassword) {
      return NextResponse.json({ ok: false, error: "Текущий пароль обязателен" }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ ok: false, error: "Новый пароль слишком короткий (минимум 4 символа)" }, { status: 400 });
    }

    // Проверяем старый пароль
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const anyUser: any = user;
    const storedHash = String(anyUser.passwordHash ?? "");
    const storedPlain = String(anyUser.password ?? ""); // если где-то осталось

    let passwordOk = false;
    if (storedHash) passwordOk = await bcrypt.compare(oldPassword, storedHash);
    else if (storedPlain) passwordOk = storedPlain === oldPassword;

    if (!passwordOk) {
      return NextResponse.json({ ok: false, error: "Неверный текущий пароль" }, { status: 400 });
    }

    // Устанавливаем новый пароль
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/profile/password error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

