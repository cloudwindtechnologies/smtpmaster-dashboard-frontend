import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // 🔐 Get token from request header
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔁 Call Laravel backend
    const res = await fetch(`${apiURL}/api/v1/admin/listDomainsDetails`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader, // forward token
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to load domains list" },
        { status: res.status }
      );
    }

    // ✅ Normalize response for frontend
    const allData =
      data?.data?.allData ??
      data?.allData ??
      [];

    return NextResponse.json(
      {
        message: data?.message || "Domains loaded successfully",
        data: {
          allData: Array.isArray(allData) ? allData : [],
        },
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
