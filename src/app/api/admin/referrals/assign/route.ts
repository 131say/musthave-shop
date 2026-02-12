import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    const body = await req.json().catch(() => null);
    const inviterLogin = String(body?.inviterLogin ?? "").trim().toLowerCase();
    const inviteeLogin = String(body?.inviteeLogin ?? "").trim().toLowerCase();
    if (!inviterLogin || !inviteeLogin) {
      return NextResponse.json({ ok: false, error: "inviterLogin/inviteeLogin required" }, { status: 400 });
    }
    if (inviterLogin === inviteeLogin) {
      return NextResponse.json({ ok: false, error: "Нельзя привязать самого себя" }, { status: 400 });
    }

    const out = await prisma.$transaction(async (tx) => {
      const inviter = await tx.user.findUnique({ where: { login: inviterLogin } });
      if (!inviter) return { ok: false as const, error: "Inviter not found" };

      const invitee = await tx.user.findUnique({ where: { login: inviteeLogin } });
      if (!invitee) return { ok: false as const, error: "Invitee not found" };

      if (invitee.referredByUserId) return { ok: false as const, error: "Этот клиент уже привязан" };

      // Для блоггеров (referralsEnabled = true) не проверяем ограничения по слотам
      const isBlogger = (inviter as any).referralsEnabled === true;
      
      if (!isBlogger) {
        const total = (inviter as any).slotsTotal ?? 1;
        const used = (inviter as any).slotsUsed ?? 0;
        if (total - used <= 0) return { ok: false as const, error: "Нет свободных слотов у пригласившего" };
      }

      await tx.user.update({
        where: { id: invitee.id },
        data: { referredByUserId: inviter.id },
      });

      // Увеличиваем slotsUsed только для обычных пользователей (не блоггеров)
      if (!isBlogger) {
        await tx.user.update({
          where: { id: inviter.id },
          data: { slotsUsed: { increment: 1 } } as any,
        });
      }

      return { ok: true as const };
    });

    if (!out.ok) return NextResponse.json(out, { status: 400 });
    return NextResponse.json(out);
  } catch (e) {
    console.error("POST /api/admin/referrals/assign", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

