import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

const LOGOUT_TIMEOUT_MS = 10_000;

function getCookieValue(cookieHeader: string, key: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getAuthHeader(req: NextRequest): string {
  const headerAuth = req.headers.get("authorization") || "";

  if (headerAuth.toLowerCase().startsWith("bearer ")) {
    return headerAuth;
  }

  const cookieToken = getCookieValue(req.headers.get("cookie") || "", "token");
  return cookieToken ? `Bearer ${cookieToken}` : "";
}

function clearAuthCookies(response: NextResponse) {
  ["token", "role"].forEach((name) => {
    response.cookies.set(name, "", {
      httpOnly: name === "token",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  });
}

async function handleLogout(req: NextRequest) {
  try {
    const auth = getAuthHeader(req);

    if (!auth) {
      const response = NextResponse.json(
        { success: true, message: "No active session" },
        { status: 200 }
      );
      clearAuthCookies(response);
      return response;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);
    let laravelRes: Response;

    try {
      laravelRes = await fetch(`${apiURL}/api/v1/logout`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: auth,
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      const aborted = error instanceof Error && error.name === "AbortError";
      const response = NextResponse.json(
        {
          success: false,
          message: aborted ? "Logout request timed out" : "Logout request failed",
        },
        { status: aborted ? 504 : 502 }
      );
      clearAuthCookies(response);
      return response;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await laravelRes.json().catch(() => ({}));

    const response = NextResponse.json(data, { status: laravelRes.status });
    clearAuthCookies(response);
    return response;
  } catch (e: unknown) {
    const response = NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
    clearAuthCookies(response);
    return response;
  }
}

export async function GET(req: NextRequest) {
  return handleLogout(req);
}

export async function POST(req: NextRequest) {
  return handleLogout(req);
}
