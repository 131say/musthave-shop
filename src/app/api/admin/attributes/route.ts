export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    const groups = await prisma.attributeGroup.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: {
        values: {
          orderBy: [{ sort: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            groupId: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, groups });
  } catch (e) {
    console.error("admin/attributes GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}





