import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// GET /api/wishlist - получить список товаров в вишлисте
export async function GET() {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            brand: true,
            categories: { include: { category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const products = wishlistItems.map((item) => {
      const p = item.product;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        oldPrice: p.oldPrice,
        imageUrl: p.imageUrl,
        brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
        categories: p.categories.map((pc: any) => ({
          id: pc.category.id,
          name: pc.category.name,
          slug: pc.category.slug,
        })),
        addedAt: item.createdAt,
      };
    });

    return NextResponse.json({ ok: true, products });
  } catch (e: any) {
    console.error("GET /api/wishlist error:", e);
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

// POST /api/wishlist - добавить товар в вишлист
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });

    const productId = Number(body.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
    }

    // Проверяем, существует ли товар
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    // Проверяем, не добавлен ли уже товар в вишлист
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, message: "Already in wishlist" });
    }

    // Добавляем товар в вишлист
    await prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
    });

    return NextResponse.json({ ok: true, message: "Added to wishlist" });
  } catch (e: any) {
    console.error("POST /api/wishlist error:", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    // Если ошибка уникальности - товар уже в вишлисте
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: true, message: "Already in wishlist" });
    }
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

