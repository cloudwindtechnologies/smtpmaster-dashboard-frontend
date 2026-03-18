import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const body = await req.json().catch(() => ({}));
    const userId = req.headers.get('userId') || "";
    // Forward to Laravel
    const res = await fetch(
      `${apiURL}/api/v1/admin/updateEmailConfig/${userId}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify(body),
      }
    );

    const json = await res.json().catch(() => ({}));

    // pass exact Laravel errors/status back to frontend
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { message: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
