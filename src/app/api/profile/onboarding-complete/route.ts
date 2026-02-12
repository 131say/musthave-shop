import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const c = await cookies();
    const userIdRaw = c.get("sb_userId")?.value;
    const userId = userIdRaw ? Number(userIdRaw) : null;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Обновляем флаг онбординга
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/profile/onboarding-complete error:", e);
    return NextResponse.json(
      { ok: false, error: "Ошибка сохранения" },
      { status: 500 }
    );
  }
}
