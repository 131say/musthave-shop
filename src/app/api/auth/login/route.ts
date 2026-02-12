import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Role = "CUSTOMER" | "ADMIN" | "CASHIER";

function normalizeLogin(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const login = normalizeLogin(body?.login);
    const password = String(body?.password ?? "");

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "login/password required" }, { status: 400 });
    }

    // ✅ ЛОГИН = user.login (новое поведение)
    // Сначала ищем по login, если не найдено - ищем по phone
    let user = await prisma.user.findUnique({ where: { login } });
    
    if (!user) {
      // Если не найден по login, пробуем найти по phone
      user = await prisma.user.findFirst({ where: { phone: login } });
    }

    if (!user) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

    const anyUser: any = user;
    const storedHash = String(anyUser.passwordHash ?? "");
    const storedPlain = String(anyUser.password ?? ""); // если где-то осталось

    let ok = false;
    if (storedHash) ok = await bcrypt.compare(password, storedHash);
    else if (storedPlain) ok = storedPlain === password;

    if (!ok) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

    const roleRaw = String((anyUser.role as Role) ?? "CUSTOMER");
    const role = roleRaw.toUpperCase();

    const c = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    c.set("sb_userId", String(user.id), { 
      httpOnly: true, 
      sameSite: "lax", 
      path: "/",
      secure: isProduction 
    });
    c.set("sb_role", role, { 
      httpOnly: true, 
      sameSite: "lax", 
      path: "/",
      secure: isProduction 
    });

    console.log(`[LOGIN] User ${user.id} (${user.login}) logged in with role: ${role}`);

    return NextResponse.json({ ok: true, userId: user.id, role });
  } catch (e) {
    console.error("POST /api/auth/login", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}






