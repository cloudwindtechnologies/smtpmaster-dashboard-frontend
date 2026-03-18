import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Read Authorization header from frontend request
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Authorization header missing" },
        { status: 401 }
      );
    }

    // 2️⃣ Call Laravel API
    const backendRes = await fetch(
      `${apiURL}/api/v1/profileMe`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store", // important for auth routes
      }
    );

    // 3️⃣ Read backend response
    const data = await backendRes.json();

    // 4️⃣ Forward response & status
    return NextResponse.json(data, {
      status: backendRes.status,
    });

  } catch (error) {
    console.error("Profile proxy error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
