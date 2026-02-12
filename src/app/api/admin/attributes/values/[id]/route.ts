export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlugInGroupExcept(base: string, groupId: number, exceptId: number) {
  let slug = base || "value";
  let i = 1;
  while (true) {
    const exists = await prisma.attributeValue.findUnique({
      where: { groupId_slug: { groupId, slug } },
    });
    if (!exists || exists.id === exceptId) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const name = body?.name != null ? String(body.name).trim() : undefined;
    const sort = body?.sort != null ? Number(body.sort) : undefined;

    // Получаем текущее значение для получения groupId
    const current = await prisma.attributeValue.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Value not found" }, { status: 404 });

    const data: any = {};
    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
      data.name = name;
      data.slug = await uniqueSlugInGroupExcept(slugify(name), current.groupId, id);
    }
    if (sort !== undefined && Number.isFinite(sort)) {
      data.sort = sort;
    }

    const value = await prisma.attributeValue.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, value });
  } catch (e: any) {
    console.error("admin/attributes/values/[id] PATCH error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    // Проверяем, используется ли значение в товарах
    const productsCount = await prisma.productAttribute.count({ where: { valueId: id } });
    if (productsCount > 0) {
      return NextResponse.json(
        { error: "Значение используется в товарах. Сначала удалите связи с товарами." },
        { status: 400 }
      );
    }

    await prisma.attributeValue.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/attributes/values/[id] DELETE error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

