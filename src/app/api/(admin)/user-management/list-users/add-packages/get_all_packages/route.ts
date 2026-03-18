import { NextResponse } from "next/server";
import { apiURL } from "@/components/app_component/common/http";

export async function GET(req: Request) {
  try {
    // ✅ read userId from query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing query param: userId" },
        { status: 400 }
      );
    }

    // forward Authorization header
    const auth = req.headers.get("authorization") || "";

    const upstream = await fetch(`${apiURL}/api/v1/admin/allpackage/${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
