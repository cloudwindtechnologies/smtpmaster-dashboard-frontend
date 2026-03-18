import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";


export async function POST( req: Request) {
  try {
    const token = req.headers.get("authorization") || "";
    const userId=req.headers.get('client-id') || "";
    const body = await req.json();

    const res = await fetch(
      `${apiURL}/api/v1/admin/emailConfig/${userId}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(body),
      }
    );

    const json = await res.json().catch(() => ({}));

    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
