export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

async function ensureRow() {
  // IMPORTANT: use upsert to avoid race conditions (HMR / double requests)
  return prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

function clampPercent(n: any, def: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(0, Math.min(20, Math.round(v)));
}

function clampReserve(n: any, def: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function clampInt(n: any, def: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(min, Math.min(max, Math.round(v)));
}

export async function GET() {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const row = await ensureRow();
    return NextResponse.json({ ok: true, settings: row });
  } catch (e: any) {
    console.error("admin/settings GET error", e);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
        details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

    const current = await ensureRow();
    const customerPercent = clampPercent(body.customerPercent, current.customerPercent);
    const inviterPercent = clampPercent(body.inviterPercent, current.inviterPercent);
    const inviterBonusLevel2Percent = clampPercent(body.inviterBonusLevel2Percent, current.inviterBonusLevel2Percent ?? 2);
    const allowFullBonusPay = Boolean(body.allowFullBonusPay);
    const reservePercent = clampReserve(body.reservePercent, current.reservePercent ?? 30);
    const slotBaseBonus = clampInt(body.slotBaseBonus, current.slotBaseBonus ?? 1000, 0, 100000);
    const slotStepBonus = clampInt(body.slotStepBonus, current.slotStepBonus ?? 500, 0, 100000);
    
    // Промо-блок
    const promoTitle = typeof body.promoTitle === "string" ? body.promoTitle.trim() || null : null;
    const promoDescription = typeof body.promoDescription === "string" ? body.promoDescription.trim() || null : null;
    const promoTags = typeof body.promoTags === "string" ? body.promoTags.trim() || null : null;
    const promoImageUrl = typeof body.promoImageUrl === "string" ? body.promoImageUrl.trim() || null : null;

    // also upsert-safe (if row deleted manually)
    const updated = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: { 
        customerPercent, 
        inviterPercent,
        inviterBonusLevel2Percent,
        allowFullBonusPay, 
        reservePercent, 
        slotBaseBonus, 
        slotStepBonus,
        promoTitle,
        promoDescription,
        promoTags,
        promoImageUrl,
      },
      create: { 
        id: 1, 
        customerPercent, 
        inviterPercent,
        inviterBonusLevel2Percent,
        allowFullBonusPay, 
        reservePercent, 
        slotBaseBonus, 
        slotStepBonus,
        promoTitle,
        promoDescription,
        promoTags,
        promoImageUrl,
      },
    });

    return NextResponse.json({ ok: true, settings: updated });
  } catch (e: any) {
    console.error("admin/settings POST error", e);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
        details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined,
      },
      { status: 500 }
    );
  }
}






