// app/api/packages/all/route.ts
import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // no cache

export async function GET(req: Request) {
  try {
    // ✅ forward Authorization header (Bearer token) from client to Laravel
    const auth = req.headers.get("authorization") || "";

    const laravelRes = await fetch(`${apiURL}/api/v1/userpackage`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        authorization: auth, // forward token
      },
      cache: "no-store",
    });

    const text = await laravelRes.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // if Laravel returns HTML or invalid JSON
      data = { __raw: text };
    }

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          message: data?.message || `Laravel request failed (${laravelRes.status})`,
          status: laravelRes.status,
          data,
        },
        { status: laravelRes.status }
      );
    }

    // ✅ keep same structure your frontend already supports: { data: [...] } OR [...]
    // Here we normalize to: { data: [...] }
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Server error in Next API" },
      { status: 500 }
    );
  }
}
