import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {


    // ✅ Get id from search params
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("Missing invoice id.", 400);
    }

    // Forward Authorization header
    const auth = req.headers.get("authorization") || "";

    const upstream = await fetch(
      `${apiURL}/api/v1/user/view_invoice/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(auth ? { Authorization: auth } : {}),
        },
        cache: "no-store",
      }
    );

    const contentType = upstream.headers.get("content-type") || "";
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": contentType.includes("application/json")
          ? "application/json; charset=utf-8"
          : contentType || "text/plain; charset=utf-8",
      },
    });
  } catch (error: any) {
    return jsonError(error?.message || "Unknown server error", 500);
  }
}