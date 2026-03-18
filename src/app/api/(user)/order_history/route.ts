import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(`${apiURL}/api/v1/user/order_history`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        authorization: auth,
      },
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = {};

    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { code: 500, message: "Invalid JSON from backend", data: text },
        { status: 500 }
      );
    }

    // If Laravel returns non-200, forward it as-is (but safe)
    if (!res.ok) {
      return NextResponse.json(
        {
          code: json?.code ?? res.status,
          message: json?.message ?? `Backend error (${res.status})`,
          data: json?.data ?? null,
        },
        { status: res.status }
      );
    }

    // ✅ Return exactly your structure
    return NextResponse.json(
      {
        code: json?.code ?? 200,
        message: json?.message ?? "Successful",
        data: json?.data ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, message: e?.message || "Server error", data: null },
      { status: 500 }
    );
  }
}
