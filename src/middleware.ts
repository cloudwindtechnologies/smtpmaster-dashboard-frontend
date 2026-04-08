import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type OnboardingStep = "statp2" | "statp3" | "statp4" | "statp5" | "statp7" | "dashboard";

const STEP_SEQUENCE: OnboardingStep[] = ["statp2", "statp3", "statp4", "statp5", "statp7", "dashboard"];

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
const PUBLIC_PREFIXES = ["/_next", "/images", "/api/auth/login", "/api/auth/register"];

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

  // If no token, allow public routes
  if (!token) {
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    if (pathname !== "/") {
      url.searchParams.set("redirect", `${pathname}${search}`);
    }

    return NextResponse.redirect(url);
  }

  // Token exists, verify it
  const decoded = await verifyJWT(token);

  if (!decoded) {
    const response = NextResponse.redirect(new URL("/login?error=invalid_session", request.url));
    response.cookies.delete("token");
    return response;
  }

  const roleId = Number(decoded?.data?.login_user_role_id);
  const wheretogo = (decoded?.data?.wheretogo as OnboardingStep) || "statp2";

  // Prevent logged-in users from opening login/signup pages
  if (AUTH_PAGES.includes(pathname)) {
    if (roleId === 1) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
  }

  // Other public routes like forgot_password can still open if you want
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (roleId === 1) {
    return NextResponse.next();
  }

  const currentStepIndex = STEP_SEQUENCE.indexOf(wheretogo);

  if (currentStepIndex === -1) {
    return NextResponse.redirect(new URL("/login?error=invalid_payload", request.url));
  }

  if (pathname === "/") {
    if (wheretogo !== "dashboard") {
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }
    return NextResponse.next();
  }

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

  if (wheretogo !== "dashboard") {
    return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};