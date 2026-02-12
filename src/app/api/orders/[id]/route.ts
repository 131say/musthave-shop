import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    if (!idStr || typeof idStr !== "string" || idStr.trim() === "") {
      return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
    }
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
    }

    const c = await cookies();
    const userId = Number(c.get("sb_userId")?.value ?? "");
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, login: true, phone: true, name: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const isOwner = order.userId === userId;
    
    // Проверка админа через БД (безопасно)
    let isAdmin = false;
    if (!isOwner) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }).catch(() => null);
      isAdmin = String((user as any)?.role ?? "").toUpperCase() === "ADMIN";
    }
    
    // Для чужих заказов возвращаем 404 (не 403), чтобы не палить существование заказа
    if (!isOwner && !isAdmin) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, order });
  } catch (e) {
    console.error("GET /api/orders/[id]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

