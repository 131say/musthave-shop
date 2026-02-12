import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// GET /api/products/[id]/reviews - получить отзывы на товар
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    if (!prisma || !prisma.review) {
      console.error("Prisma client or review model not available");
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: { id: true, name: true, login: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, reviews });
  } catch (e: any) {
    console.error("GET /api/products/[id]/reviews error:", e);
    return NextResponse.json({ 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

// POST /api/products/[id]/reviews - создать отзыв
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }

    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim() : null;
    const orderId = body.orderId ? Number(body.orderId) : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Находим DONE заказ с этим товаром
    let finalOrderId: number | null = null;
    
    if (orderId) {
      // Проверяем указанный заказ
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
          status: "DONE",
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Order not found or not completed" },
          { status: 404 }
        );
      }

      const hasProduct = order.items.some((item) => item.productId === productId);
      if (!hasProduct) {
        return NextResponse.json(
          { error: "Product not found in this order" },
          { status: 400 }
        );
      }
      
      finalOrderId = orderId;
    } else {
      // Ищем любой DONE заказ с этим товаром
      const orderWithProduct = await prisma.order.findFirst({
        where: {
          userId,
          status: "DONE",
          items: {
            some: {
              productId,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!orderWithProduct) {
        return NextResponse.json(
          { error: "You can only review products you have purchased (order status DONE)" },
          { status: 403 }
        );
      }
      
      finalOrderId = orderWithProduct.id;
    }

    // Проверяем, не оставлял ли пользователь уже отзыв на этот товар из этого заказа
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        productId,
        orderId: finalOrderId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product for this order" },
        { status: 400 }
      );
    }

    // Создаем отзыв
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment: comment || null,
        orderId: finalOrderId,
      },
      include: {
        user: {
          select: { id: true, name: true, login: true },
        },
      },
    });

    return NextResponse.json({ ok: true, review });
  } catch (e: any) {
    console.error("POST /api/products/[id]/reviews error:", e);
    // Более детальная обработка ошибок
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 400 }
      );
    }
    // Проверка на отсутствие модели Review
    if (e?.message?.includes('findFirst') || e?.message?.includes('review')) {
      console.error("Prisma review model not available. Regenerate Prisma Client.");
      return NextResponse.json({ 
        error: "Database model not available. Please restart the server.",
        details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

