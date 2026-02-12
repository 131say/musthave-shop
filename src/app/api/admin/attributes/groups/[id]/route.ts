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

async function uniqueSlugExcept(base: string, exceptId: number) {
  let slug = base || "group";
  let i = 1;
  while (true) {
    const exists = await prisma.attributeGroup.findUnique({ where: { slug } });
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

    const data: any = {};
    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
      data.name = name;
      data.slug = await uniqueSlugExcept(slugify(name), id);
    }
    if (sort !== undefined && Number.isFinite(sort)) {
      data.sort = sort;
    }

    const group = await prisma.attributeGroup.update({
      where: { id },
      data,
      include: {
        values: {
          orderBy: [{ sort: "asc" }, { name: "asc" }],
        },
      },
    });
    return NextResponse.json({ ok: true, group });
  } catch (e: any) {
    console.error("admin/attributes/groups/[id] PATCH error", e);
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

    // Проверяем, есть ли значения в группе
    const valuesCount = await prisma.attributeValue.count({ where: { groupId: id } });
    if (valuesCount > 0) {
      return NextResponse.json({ error: "У группы есть значения. Сначала удалите все значения." }, { status: 400 });
    }

    await prisma.attributeGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/attributes/groups/[id] DELETE error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

