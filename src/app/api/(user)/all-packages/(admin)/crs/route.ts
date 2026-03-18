import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(
      `${apiURL}/api/v1/admin/crs/1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        cache: "no-store",
      }
    );

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch CRS" },
      { status: 500 }
    );
  }
}