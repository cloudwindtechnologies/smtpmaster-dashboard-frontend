import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type OnboardingStep = "statp2" | "statp3" | "statp4" | "statp5" | "statp7" | "dashboard";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot_password",
  "/unauthorized",
  "/api/auth/login",
  "/api/auth/register",
  "/_next",
  "/favicon.ico",
  "/images",
  "/Logoicon.png"
];

const STEP_SEQUENCE: OnboardingStep[] = ["statp2", "statp3", "statp4", "statp5", "statp7", "dashboard"];

const STEP_TO_ROUTE: Record<OnboardingStep, string> = {
  statp2: "/signup/step-2",
  statp3: "/signup/step-3",
  statp4: "/signup/step-4",
  statp5: "/signup/step-5",
  statp7: "/signup/step-7",
  dashboard: "/"
};

const STEP_ROUTE_MAP: Record<string, number> = {
  "/signup/step-2": 0,
  "/signup/step-3": 1,
  "/signup/step-4": 2,
  "/signup/step-5": 3,
  "/signup/step-7": 4,
  "/": 5
};

async function verifyJWT(token: string): Promise<any | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY || "");
    if (!secret.length) {
      console.error("JWT_SECRET_KEY not set");
      return null;
    }
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public assets and API routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route) || pathname === route)) {
    return NextResponse.next();
  }

  // Extract token from cookies only (secure)
  const token = request.cookies.get("token")?.value;

  // No token = redirect to login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") {
      url.searchParams.set("redirect", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  // Verify JWT signature (tamper-proof)
  const decoded = await verifyJWT(token);
  
  if (!decoded) {
    // Tampered or expired token
    const response = NextResponse.redirect(new URL("/login?error=invalid_session", request.url));
    response.cookies.delete("token");
    response.cookies.delete("wheretogo");
    return response;
  }

  const roleId = decoded?.data?.login_user_role_id;
  const wheretogo = (decoded?.data?.wheretogo as OnboardingStep) || "statp2";

  // Superadmin (role_id: 1) bypasses onboarding
  if (roleId === 1) {
    return NextResponse.next();
  }

  // Check if accessing onboarding step
  const currentStepIndex = STEP_SEQUENCE.indexOf(wheretogo);
  
  // Check if accessing root/dashboard
  if (pathname === "/" || pathname.startsWith("/?")) {
    if (wheretogo !== "dashboard") {
      // Incomplete onboarding, redirect to current step
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }
    return NextResponse.next();
  }

  // Check if accessing any /signup/step-X
  const stepMatch = pathname.match(/\/signup\/step-(\d+)/);
  if (stepMatch) {
    const requestedStep = parseInt(stepMatch[1]);
    const stepKey = `statp${requestedStep}` as OnboardingStep;
    const requestedIndex = STEP_SEQUENCE.indexOf(stepKey);

    // Invalid step number
    if (requestedIndex === -1) {
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }

    // Trying to access future step (e.g., on step 2, trying to go to step 4)
    if (requestedIndex > currentStepIndex) {
      return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
    }

    // Allow access (current or previous step)
    return NextResponse.next();
  }

  // Accessing other protected routes while onboarding incomplete
  if (wheretogo !== "dashboard") {
    return NextResponse.redirect(new URL(STEP_TO_ROUTE[wheretogo], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};