import { NextRequest, NextResponse } from "next/server";
import { apiURL } from "@/components/app_component/common/http";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Get domainId from search params
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get("domain_id");

    if (!domainId) {
      return NextResponse.json(
        { message: "Missing domain id in query params" },
        { status: 400 }
      );
    }

    // 2️⃣ Get Authorization header
    const auth =
      req.headers.get("authorization") ||
      req.headers.get("Authorization");

    if (!auth) {
      return NextResponse.json(
        { errors: "Unauthorized Access" },
        { status: 401 }
      );
    }

    // 3️⃣ Call Laravel backend
    const backendRes = await fetch(
      `${apiURL}/api/v1/user/dkimValidation/${encodeURIComponent(domainId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      }
    );

    // 4️⃣ Pass-through backend response
    const text = await backendRes.text();

    return new NextResponse(text, {
      status: backendRes.status,
      headers: {
        "content-type":
          backendRes.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("DKIM validation error:", error);

    return NextResponse.json(
      {
        data: "Error occurred while validating DKIM",
        code: 500,
        message: "Failed",
        error: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}