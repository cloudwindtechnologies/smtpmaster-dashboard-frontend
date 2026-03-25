import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(`${apiURL}/api/v1/admin/admin_all_logs`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ code: 500, message: e?.message || "Proxy error" }, { status: 500 });
  }
}
