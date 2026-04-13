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

type AuthPayload = {
  data?: {
    login_user_role_id?: string | number;
    wheretogo?: string;
  };
  login_user_role_id?: string | number;
  role?: string | number;
  role_id?: string | number;
  wheretogo?: string;
};

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
const ONBOARDING_STEPS = new Set<OnboardingStep>(STEP_SEQUENCE);

const PUBLIC_ROUTES = ["/login", "/logout", "/signup", "/forgot_password", "/forgot-password", "/unauthorized"];
const PUBLIC_PREFIXES = [
  "/_next",
  "/images",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];
const ADMIN_ROUTE_PREFIXES = [
  "/add-notification",
  "/change-currency-exchange",
  "/coupons",
  "/email-account-setting",
  "/email-package-config",
  "/user-management",
];
const ADMIN_ROLE_IDS = new Set([1]);

function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/Logoicon.png") return true;
  if (pathname === "/LoginLogo.png") return true;
  return PUBLIC_PREFIXES.some((route) => pathname.startsWith(route));
}

async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const secretValue = process.env.JWT_SECRET_KEY;

    if (!secretValue) {
      console.error("[Middleware] JWT_SECRET_KEY missing");
      return null;
    }

    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jwtVerify(token, secret);
    return payload as AuthPayload;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Middleware] JWT verify failed:", message);
    return null;
  }
}

function isAuthEntryRoute(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

function isAdminRoute(pathname: string) {
  return ADMIN_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function canAccessAdminRoutes(roleId: number) {
  return ADMIN_ROLE_IDS.has(roleId);
}

function getRoleId(decoded: AuthPayload): number {
  const role =
    decoded.data?.login_user_role_id ??
    decoded.login_user_role_id ??
    decoded.role_id ??
    decoded.role;

  if (role === "superadmin" || role === "admin") {
    return 1;
  }

  if (role === null || role === undefined) {
    return 0;
  }

  // Parse numeric roles safely
  const parsed = Number.parseInt(String(role), 10);
  if (!Number.isFinite(parsed)) {
    console.warn(`Invalid role value received in JWT: ${role}, defaulting to 0`);
    return 0;
  }

  return parsed;
}

function getOnboardingStep(decoded: AuthPayload): OnboardingStep {
  const step = decoded.data?.wheretogo || decoded.wheretogo;

  // Validate step against allowed onboarding steps
  if (step && ONBOARDING_STEPS.has(step as OnboardingStep)) {
    return step as OnboardingStep;
  }

  return "statp2";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // no token
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

  const decoded = await verifyJWT(token);

  if (!decoded) {
    const response = NextResponse.redirect(new URL("/login?error=invalid_session", request.url));
    response.cookies.delete("token");
    return response;
  }

  const roleId = getRoleId(decoded);
  const wheretogo = getOnboardingStep(decoded);
  const adminRoute = isAdminRoute(pathname);
  const authEntryRoute = isAuthEntryRoute(pathname);

  if (canAccessAdminRoutes(roleId)) {
    if (authEntryRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (adminRoute) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (authEntryRoute) {
    return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const currentStepIndex = STEP_SEQUENCE.indexOf(wheretogo);

  if (currentStepIndex === -1) {
    const response = NextResponse.redirect(new URL("/login?error=invalid_payload", request.url));
    response.cookies.delete("token");
    return response;
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
