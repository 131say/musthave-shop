import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const c = await cookies();
  const userId = c.get("sb_userId")?.value;
  const role = c.get("sb_role")?.value;

  if (!userId) return NextResponse.json({ ok: true, authed: false });

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } }).catch(() => null);
  if (!user) return NextResponse.json({ ok: true, authed: false });

  // Возвращаем данные для автозаполнения чекаута
  return NextResponse.json({
    ok: true,
    authed: true,
    user: { 
      id: user.id, 
      role: role ?? (user as any).role ?? "CLIENT", 
      login: (user as any).login ?? user.phone ?? null,
      phone: user.phone ?? null,
      name: (user as any).name ?? null,
      address: (user as any).address ?? null,
    },
  });
}


