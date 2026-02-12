import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const c = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  c.set("sb_userId", "", { 
    httpOnly: true, 
    sameSite: "lax", 
    path: "/", 
    maxAge: 0,
    secure: isProduction 
  });
  c.set("sb_role", "", { 
    httpOnly: true, 
    sameSite: "lax", 
    path: "/", 
    maxAge: 0,
    secure: isProduction 
  });
  return NextResponse.json({ ok: true });
}







