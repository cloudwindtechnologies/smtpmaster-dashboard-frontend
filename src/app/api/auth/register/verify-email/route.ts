import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // token from cookie (because you set cookie "token=...")
    const cookie = req.headers.get("cookie") || "";
    const tokenMatch = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : "";

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
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
