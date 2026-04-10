import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

function getCookieValue(cookieHeader: string, key: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getAuthToken(req: Request): string {
  const cookie = req.headers.get("cookie") || "";
  const cookieToken = getCookieValue(cookie, "token");

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (bearerToken) {
    return bearerToken;
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Read token from cookie (you already set token cookie in login)
    const token = getAuthToken(req);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (token missing)" },
        { status: 401 }
      );
    }

    const laravelRes = await fetch(`${apiURL}/api/v1/updateprofile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await laravelRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: laravelRes.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
