import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// DELETE /api/wishlist/[productId] - удалить товар из вишлиста
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { productId: productIdStr } = await ctx.params;
    const productId = Number(productIdStr);
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
    }

    // Удаляем товар из вишлиста
    await prisma.wishlist.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    return NextResponse.json({ ok: true, message: "Removed from wishlist" });
  } catch (e: any) {
    console.error("DELETE /api/wishlist/[productId] error:", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

