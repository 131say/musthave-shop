import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public allowlist (login + auth api + static + public pages)
  // Важно: /admin/login и /api/auth/admin/login доступны без авторизации
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/admin/login" || // Админ-логин доступен без авторизации
    pathname.startsWith("/api/auth") || // Включает /api/auth/admin/login
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname === "/" ||
    pathname === "/catalog" ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/auth/otp") ||
    pathname.startsWith("/cart")
  ) {
    return NextResponse.next();
  }

  const userId = req.cookies.get("sb_userId")?.value;
  const role = req.cookies.get("sb_role")?.value;

  // Admin: только ADMIN роль (кроме /admin/login)
  // Проверка должна быть server-side, не только в UI
  // Route group (panel) не влияет на pathname: /admin/(panel)/products → /admin/products
  // Поэтому проверка pathname.startsWith("/admin") покрывает все страницы админки
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    // Если нет сессии - редирект на админ-логин
    if (!userId) {
      console.log(`[MIDDLEWARE] No session for ${pathname}`);
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    
    // Если роль не ADMIN - редирект на главную с параметром forbidden
    if (role !== "ADMIN") {
      console.log(`[MIDDLEWARE] Blocked access to ${pathname}: userId=${userId}, role=${role} (not ADMIN)`);
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("forbidden", "1");
      return NextResponse.redirect(url);
    }
    
    console.log(`[MIDDLEWARE] Allowed admin access: userId=${userId}, role=${role}`);
    return NextResponse.next();
  }

  // Site: require auth for everything else (account, orders, favorites, etc.)
  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};






