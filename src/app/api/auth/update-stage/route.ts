import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

const UPDATE_STAGE_TIMEOUT_MS = 10_000;

function getCookieValue(cookieHeader: string, key: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function getAuthToken(request: NextRequest): string {
  const bearerToken = getBearerToken(request);
  if (bearerToken) {
    return bearerToken;
  }

  const cookie = request.headers.get("cookie") || "";
  return getCookieValue(cookie, "token");
}

function isImpersonationRequest(request: NextRequest) {
  return request.headers.get("x-impersonation-session") === "1";
}

function getResponseToken(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const payload = data as {
    token?: unknown;
    data?: { token?: unknown };
  };

  return typeof payload.token === "string"
    ? payload.token
    : typeof payload.data?.token === "string"
      ? payload.data.token
      : "";
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (token missing)" },
        { status: 401 }
      );
    }

    const requestBody = await request.text();
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      UPDATE_STAGE_TIMEOUT_MS
    );
    let backendRes: Response;

    try {
      backendRes = await fetch(`${apiURL}/api/v1/updateStage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: requestBody || "{}",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return NextResponse.json(
        { code: aborted ? 504 : 502, message: aborted ? "Request timed out" : "Request failed" },
        { status: aborted ? 504 : 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const rawText = await backendRes.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      const truncated = rawText.length > 200 ? rawText.substring(0, 200) + "..." : rawText;
      console.error(`updateStage backend returned non-JSON (${rawText.length} chars):`, truncated);
      return NextResponse.json({
        code: 500,
        message: 'Backend returned non-JSON response',
        status: backendRes.status,
      }, { status: 500 });
    }

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    const response = NextResponse.json(data);
    const refreshedToken = getResponseToken(data);

    if (refreshedToken && !isImpersonationRequest(request)) {
      response.cookies.set("token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { code: 500, message: 'Request failed' },
      { status: 500 }
    );
  }
}
