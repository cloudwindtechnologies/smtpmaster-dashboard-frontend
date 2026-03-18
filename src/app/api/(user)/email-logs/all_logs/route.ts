import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text(); // already JSON string

    const res = await fetch(
      `${apiURL}/api/v1/all_logs`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        body, // forward as-is
        cache: "no-store",
      }
    );

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}