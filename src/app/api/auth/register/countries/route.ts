import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET() {
  try {

    const laravelRes = await fetch(`${apiURL}/api/v1/getcountry`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await laravelRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: laravelRes.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
