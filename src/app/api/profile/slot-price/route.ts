import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNextSlotPriceForUser } from "@/lib/slots";
import { prisma } from "@/lib/prisma";

async function authedUserId() {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const id = Number(v);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET() {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { slotsTotal: true, referralsEnabled: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    
    // Для блоггеров система слотов отключена
    if ((user as any).referralsEnabled === true) {
      return NextResponse.json({ ok: false, error: "Для блоггеров система слотов отключена", slotPrice: null, slotIndex: null });
    }
    
    const slotInfo = await getNextSlotPriceForUser((user as any).slotsTotal ?? 1);
    return NextResponse.json({ ok: true, slotPrice: slotInfo.price, slotIndex: slotInfo.nextSlotNumber });
  } catch (e) {
    console.error("GET /api/profile/slot-price", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}


