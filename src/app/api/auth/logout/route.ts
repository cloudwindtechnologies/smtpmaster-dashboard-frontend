import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization"); // "Bearer xxx"
    if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { code: 401, message: "Missing token" },
        { status: 401 }
      );
    }

    const laravelRes = await fetch(`${apiURL}/api/v1/logout`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
      cache: "no-store",
    });

    const data = await laravelRes.json().catch(() => ({}));

    return NextResponse.json(data, { status: laravelRes.status });
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
