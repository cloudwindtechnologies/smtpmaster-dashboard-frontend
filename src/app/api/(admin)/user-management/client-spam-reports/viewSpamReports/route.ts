import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // 🔐 Get token from request header
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔁 Call Laravel backend
    const res = await fetch(`${apiURL}/api/v1/admin/viewSpamReports`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader, // forward token
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to fetch spam reports" },
        { status: res.status }
      );
    }

    // ✅ Keep response structure frontend-friendly
    return NextResponse.json(
      {
        data:data ??[],
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
