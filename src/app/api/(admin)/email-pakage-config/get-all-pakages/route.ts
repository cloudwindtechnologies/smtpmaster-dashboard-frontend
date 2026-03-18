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
    const res = await fetch(`${apiURL}/api/v1/admin/emailPackageget`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader, // forward token
      }
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to fetch packages" },
        { status: res.status }
      );
    }

    // ✅ IMPORTANT: keep same structure your frontend expects
    return NextResponse.json(
      {
        data: data?.data ?? data?.packages ?? [],
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
