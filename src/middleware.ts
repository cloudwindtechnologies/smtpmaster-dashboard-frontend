import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type OnboardingStep =
  | "statp2"
  | "statp3"
  | "statp4"
  | "statp5"
  | "statp7"
  | "dashboard";

const STEP_SEQUENCE: OnboardingStep[] = [
  "statp2",
  "statp3",
  "statp4",
  "statp5",
  "statp7",
  "dashboard",
];

const STEP_TO_ROUTE: Record<OnboardingStep, string> = {
  statp2: "/signup/step-2",
  statp3: "/signup/step-3",
  statp4: "/signup/step-4",
  statp5: "/signup/step-5",
  statp7: "/signup/step-7",
  dashboard: "/",
};

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot_password", "/unauthorized"];
const PUBLIC_PREFIXES = [
  "/_next",
  "/images",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/Logoicon.png") return true;
  return PUBLIC_PREFIXES.some((route) => pathname.startsWith(route));
}

async function verifyJWT(token: string): Promise<any | null> {
  try {
    const secretValue = process.env.JWT_SECRET_KEY;

    if (!secretValue) {
      console.error("[Middleware] JWT_SECRET_KEY missing");
      return null;
    }

    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error: any) {
    console.error("[Middleware] JWT verify failed:", error.message);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // 1) No token
  if (!token) {
    // allow public pages
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // everything else goes to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    if (pathname !== "/") {
      url.searchParams.set("redirect", `${pathname}${search}`);
    }

    return NextResponse.redirect(url);
  }

  // 2) Token exists -> verify
  const decoded = await verifyJWT(token);

  // invalid token -> clear cookie and allow login page only
  if (!decoded) {
    if (AUTH_PAGES.includes(pathname)) {
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }

    const response = NextResponse.redirect(new URL("/login?error=invalid_session", request.url));
    response.cookies.delete("token");
    return response;
  }

  const roleId = Number(decoded?.data?.login_user_role_id);
  const wheretogo = (decoded?.data?.wheretogo as OnboardingStep) || "statp2";

  // 3) Logged in user should not access login/signup
  if (AUTH_PAGES.includes(pathname)) {
    if (roleId === 1) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
  }

  // 4) Other public routes allowed
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 5) Superadmin bypass
  if (roleId === 1) {
    return NextResponse.next();
  }

  const currentStepIndex = STEP_SEQUENCE.indexOf(wheretogo);

  if (currentStepIndex === -1) {
    const response = NextResponse.redirect(new URL("/login?error=invalid_payload", request.url));
    response.cookies.delete("token");
    return response;
  }

  // 6) Root route
  if (pathname === "/") {
    if (wheretogo !== "dashboard") {
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }
    return NextResponse.next();
  }

  // 7) Signup step route
  const stepMatch = pathname.match(/^\/signup\/step-(\d+)$/);

  if (stepMatch) {
    const requestedStep = Number(stepMatch[1]);
    const stepKey = `statp${requestedStep}` as OnboardingStep;
    const requestedIndex = STEP_SEQUENCE.indexOf(stepKey);

    if (requestedIndex === -1) {
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }

    if (requestedIndex > currentStepIndex) {
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }

    return NextResponse.next();
  }

  // 8) Block protected routes until onboarding complete
  if (wheretogo !== "dashboard") {
    return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};