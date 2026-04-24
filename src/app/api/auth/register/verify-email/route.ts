import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

function getCookieValue(cookieHeader: string, key: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getAuthToken(req: Request): string {
  const bearerToken = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (bearerToken) {
    return bearerToken;
  }

  return getCookieValue(req.headers.get("cookie") || "", "token");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = getAuthToken(req);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (token missing)" },
        { status: 401 }
      );
    }
    const url = `${apiURL}/api/v1/verifyEmail`;

    const laravelRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await laravelRes.json().catch(() => ({}));

    return NextResponse.json(data, { status: laravelRes.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
