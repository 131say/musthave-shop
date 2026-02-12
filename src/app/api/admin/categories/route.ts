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

async function uniqueSlug(base: string) {
  let slug = base || "category";
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function GET() {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const categories = await prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ ok: true, categories });
  } catch (e) {
    console.error("admin/categories GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const parentIdRaw = body?.parentId;
    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const slug = await uniqueSlug(slugify(name));

    const category = await prisma.category.create({
      data: { name, slug, parentId: parentId ?? null },
    });

    return NextResponse.json({ ok: true, category });
  } catch (e: any) {
    console.error("admin/categories POST error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}
