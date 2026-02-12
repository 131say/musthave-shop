import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlugExcept(base: string, exceptId: number) {
  let slug = base || "category";
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (!exists || exists.id === exceptId) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const name = body?.name != null ? String(body.name).trim() : undefined;
    const parentIdRaw = body?.parentId;
    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    const data: any = {};
    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
      data.name = name;
      data.slug = await uniqueSlugExcept(slugify(name), id);
    }
    if (body?.hasOwnProperty("parentId")) {
      data.parentId = parentId ?? null;
    }

    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ ok: true, category });
  } catch (e: any) {
    console.error("admin/categories/[id] PATCH error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    // запретим удалять, если есть дочерние или привязки к товарам
    const children = await prisma.category.count({ where: { parentId: id } });
    if (children > 0) return NextResponse.json({ error: "У категории есть подкатегории" }, { status: 400 });

    const links = await prisma.productCategory.count({ where: { categoryId: id } });
    if (links > 0) return NextResponse.json({ error: "Категория привязана к товарам" }, { status: 400 });

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/categories/[id] DELETE error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}
