import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: Request
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const userId=req.headers.get('user-Id') || "";
    const res = await fetch(
      `${apiURL}/api/v1/admin/emailConfig/${userId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(json, { status: res.status });
    }

    /**
     * Normalize response so frontend logic works without changes
     *
     * Supported Laravel responses:
     * 1️⃣ { id, email_send_type, ... }
     * 2️⃣ { email_config: { ... } }
     * 3️⃣ { email_config: [ { ... } ] }
     */
    let data: any = json;
    if (json?.email_config) data = json.email_config;
    if (Array.isArray(data)) data = data[0];

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Failed to load configuration details" },
      { status: 500 }
    );
  }
}
