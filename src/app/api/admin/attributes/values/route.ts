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

async function uniqueSlugInGroup(base: string, groupId: number) {
  let slug = base || "value";
  let i = 1;
  while (true) {
    const exists = await prisma.attributeValue.findUnique({
      where: { groupId_slug: { groupId, slug } },
    });
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const groupId = body?.groupId != null ? Number(body.groupId) : null;
    const sort = body?.sort != null ? Number(body.sort) : 0;

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!groupId || !Number.isFinite(groupId)) {
      return NextResponse.json({ error: "groupId required" }, { status: 400 });
    }

    // Проверяем существование группы
    const group = await prisma.attributeGroup.findUnique({ where: { id: groupId } });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const slug = await uniqueSlugInGroup(slugify(name), groupId);

    const value = await prisma.attributeValue.create({
      data: {
        name,
        slug,
        groupId,
        sort: Number.isFinite(sort) ? sort : 0,
      },
    });

    return NextResponse.json({ ok: true, value });
  } catch (e: any) {
    console.error("admin/attributes/values POST error", e);
    return NextResponse.json(
      { error: "Server error", details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined },
      { status: 500 }
    );
  }
}

