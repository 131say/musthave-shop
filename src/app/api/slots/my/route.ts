import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));

    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: "No userId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { placements: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const slots = Array.from({ length: user.slotsTotal }, (_, i) => {
      const slot = i + 1;
      const placed = user.placements.find(p => p.placementSlot === slot);
      return {
        slot,
        occupied: Boolean(placed),
        user: placed ? { id: placed.id, phone: placed.phone } : null,
      };
    });

    return NextResponse.json({ ok: true, slots });
  } catch (e: any) {
    console.error("slots/my error", e);
    return NextResponse.json(
      { error: "Internal error", details: e?.message },
      { status: 500 }
    );
  }
}






