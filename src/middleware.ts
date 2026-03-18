import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role = "superadmin" | "user";

// 🔐 Role-based routes
const SUPERADMIN_ROUTES = [
  "/email-account-setting",
  "/user-management",
  "/change-currency-exchange",
  "/email-package-config",
  "/notification",
];

const SHARED_ROUTES = [
  "/",
  "/email-logs",
  "/my-account",
  "/support-ticket",
];

// ✅ Match helper
function matchAny(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

// ✅ Edge-safe base64url JWT decode
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const raw = atob(base64);

    const json = decodeURIComponent(
      raw
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeJwtPayload(token);
  if (!decoded?.exp) return true;
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ✅ Public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  // ✅ Read cookies
  const token = req.cookies.get("token")?.value;
  const role = req.cookies.get("role")?.value as Role | undefined;

  // ❌ Missing or expired token
  if (!token || !role || isTokenExpired(token)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";

    // ✅ save current page so user returns here after login
    url.searchParams.set("redirect", `${pathname}${search}`);

    const response = NextResponse.redirect(url);
    response.cookies.delete("token");
    response.cookies.delete("role");
    return response;
  }

  // 🔐 Superadmin-only
  if (matchAny(pathname, SUPERADMIN_ROUTES)) {
    if (role !== "superadmin") {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 🔐 Shared routes
  if (matchAny(pathname, SHARED_ROUTES)) {
    if (role !== "superadmin" && role !== "user") {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};