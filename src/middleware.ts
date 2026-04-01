import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role = "superadmin" | "user";

const SUPERADMIN_ROUTES = [
  "/email-account-setting",
  "/user-manageseement",
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

function matchAny(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const raw = atob(padded);

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

function isTokenExpired(decoded: any): boolean {
  if (!decoded?.exp) return true;
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

function shouldSkipRedirectStore(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/signup") ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/forgot_password")
  );
}

function getStepPathFromWhereToGo(wheretogo?: string | null) {
  const key = (wheretogo || "").toLowerCase().trim();

  const stageToStep: Record<string, string> = {
    statp2: "/signup/step-2",
    statp3: "/signup/step-3",
    statp4: "/signup/step-4",
    statp5: "/signup/step-5",
    statp7: "/signup/step-7",
  };

  return stageToStep[key] || null;
}

function getSafeRole(decoded: any, cookieRole?: string): Role | undefined {
  const roleFromToken = decoded?.role;
  if (roleFromToken === "superadmin" || roleFromToken === "user") {
    return roleFromToken;
  }

  if (cookieRole === "superadmin" || cookieRole === "user") {
    return cookieRole;
  }

  return undefined;
}

function getSafeWhereToGo(decoded: any, cookieWhereToGo?: string): string | null {
  const tokenWhereToGo = decoded?.wheretogo;

  if (typeof tokenWhereToGo === "string" && tokenWhereToGo.trim()) {
    return tokenWhereToGo;
  }

  if (typeof cookieWhereToGo === "string" && cookieWhereToGo.trim()) {
    return cookieWhereToGo;
  }

  return null;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // always allow forgot password without touching cookies
  if (pathname.startsWith("/forgot_password")) {
    return NextResponse.next();
  }

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    const requestedUrl = `${pathname}${search}`;

    if (!shouldSkipRedirectStore(pathname)) {
      url.searchParams.set("redirect", requestedUrl);
    }

    return NextResponse.redirect(url);
  }

  const decoded = decodeJwtPayload(token);

  if (!decoded || isTokenExpired(decoded)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    const requestedUrl = `${pathname}${search}`;

    if (!shouldSkipRedirectStore(pathname)) {
      url.searchParams.set("redirect", requestedUrl);
    }

    return NextResponse.redirect(url);
  }

  const role = getSafeRole(decoded, req.cookies.get("role")?.value);
  const wheretogo = getSafeWhereToGo(decoded, req.cookies.get("wheretogo")?.value);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const requiredStepPath = getStepPathFromWhereToGo(wheretogo);

  if (requiredStepPath) {
    const isExactRequiredStep = pathname === requiredStepPath;

    if (!isExactRequiredStep) {
      const url = req.nextUrl.clone();
      url.pathname = requiredStepPath;
      url.search = "";

      const requestedUrl = `${pathname}${search}`;

      if (!shouldSkipRedirectStore(pathname)) {
        url.searchParams.set("redirect", requestedUrl);
      }

      return NextResponse.redirect(url);
    }
  }

  if (matchAny(pathname, SUPERADMIN_ROUTES)) {
    if (role !== "superadmin") {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

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