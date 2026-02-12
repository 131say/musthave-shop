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

async function uniqueSlug(base: string) {
  let slug = base || "group";
  let i = 1;
  while (true) {
    const exists = await prisma.attributeGroup.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function GET() {
  try {
    const groups = await prisma.attributeGroup.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: {
        values: {
          orderBy: [{ sort: "asc" }, { name: "asc" }],
        },
      },
    });
    return NextResponse.json({ ok: true, groups });
  } catch (e: any) {
    console.error("admin/attributes/groups GET error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const sort = body?.sort != null ? Number(body.sort) : 0;

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const slug = await uniqueSlug(slugify(name));

    const group = await prisma.attributeGroup.create({
      data: { name, slug, sort: Number.isFinite(sort) ? sort : 0 },
      include: {
        values: true,
      },
    });

    return NextResponse.json({ ok: true, group });
  } catch (e: any) {
    console.error("admin/attributes/groups POST error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

