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

function shouldSkipRedirectStore(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/signup") ||
    pathname === "/unauthorized" ||
    pathname === "/forgot-password"
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

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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
  const role = req.cookies.get("role")?.value as Role | undefined;
  const wheretogo = req.cookies.get("wheretogo")?.value;

  if (!token || !role || isTokenExpired(token)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    const requestedUrl = `${pathname}${search}`;

    if (!shouldSkipRedirectStore(pathname)) {
      url.searchParams.set("redirect", requestedUrl);
    }

    const response = NextResponse.redirect(url);
    response.cookies.delete("token");
    response.cookies.delete("role");
    response.cookies.delete("wheretogo");
    return response;
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
      } else {
        const existingRedirect = req.nextUrl.searchParams.get("redirect");
        if (existingRedirect) {
          url.searchParams.set("redirect", existingRedirect);
        }
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