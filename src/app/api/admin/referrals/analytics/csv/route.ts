export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Math.trunc(num(v, fallback));
  return Math.min(max, Math.max(min, n));
}

function dateKeyAlmaty(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function csvEscape(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Same business mapping as analytics JSON:
// - ORDER_BONUS + event.userId === order.userId => cashback
// - ORDER_BONUS + event.referredUserId != null => l1
// - LEVEL_BONUS => l2
function classify(e: {
  type: string;
  userId: number;
  referredUserId: number | null;
  order?: { userId: number | null } | null;
}): "cashback" | "l1" | "l2" | "other" {
  if (e.type === "LEVEL_BONUS") return "l2";
  if (e.type === "ORDER_BONUS") {
    const orderBuyerId = e.order?.userId ?? null;
    // Если userId события совпадает с userId заказа - это cashback покупателя
    if (orderBuyerId && Number(e.userId) === Number(orderBuyerId)) return "cashback";
    // Если есть referredUserId - это L1 бонус реферера
    if (e.referredUserId !== null) return "l1";
    return "l1";
  }
  return "other";
}

export async function GET(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    const url = new URL(req.url);
    const days = clampInt(url.searchParams.get("days"), 1, 365, 30);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await prisma.referralEvent.findMany({
      where: { createdAt: { gte: from } },
      select: {
        id: true,
        userId: true,
        referredUserId: true,
        orderId: true,
        type: true,
        amount: true,
        createdAt: true,
        user: { select: { phone: true, email: true } },
        order: {
          select: {
            id: true,
            userId: true,
            cashPaid: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const header = [
      "date",
      "createdAt",
      "kind",
      "eventType",
      "amount",
      "orderId",
      "buyerUserId",
      "referrerUserId",
      "referrerPhone",
      "referrerEmail",
      "cashPaid",
    ];

    const lines: string[] = [];
    lines.push(header.join(","));

    for (const e of events) {
      const kind = classify(e);
      const date = dateKeyAlmaty(e.createdAt);
      const createdAt = e.createdAt.toISOString();

      const orderId = e.orderId ?? "";
      const buyerUserId = e.order?.userId ?? "";
      const referrerUserId = e.userId;
      const referrerPhone = e.user?.phone ?? "";
      const referrerEmail = e.user?.email ?? "";
      const cashPaid = e.order?.cashPaid ?? "";

      const row = [
        date,
        createdAt,
        kind,
        e.type,
        e.amount,
        orderId,
        buyerUserId,
        referrerUserId,
        referrerPhone,
        referrerEmail,
        cashPaid,
      ].map(csvEscape);

      lines.push(row.join(","));
    }

    const csv = lines.join("\n");

    const today = dateKeyAlmaty(new Date());
    const filename = `referrals-analytics-${today}-last${days}d.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("referrals analytics csv error:", e);
    return NextResponse.json(
      {
        error: "CSV export failed",
        details: process.env.NODE_ENV !== "production" ? String(e?.message || e) : undefined,
      },
      { status: 500 }
    );
  }
}
