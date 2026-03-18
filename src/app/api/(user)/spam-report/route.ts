import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const url = new URL(req.url);

    // optional: pagination support
    const page = url.searchParams.get("page") || "1";

    const upstream = await fetch(
      `${apiURL}/api/v1/spamReport?page=${page}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: auth, // pass Bearer token from frontend
        },
        cache: "no-store",
      }
    );

    const text = await upstream.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { __raw: text };
    }

    return NextResponse.json(json, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
