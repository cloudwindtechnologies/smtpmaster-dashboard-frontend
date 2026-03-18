import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // frontend sends: authorization: Bearer <token>
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Token not found" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get("id");

    if (!domainId) {
      return NextResponse.json(
        { success: false, message: "Missing id" },
        { status: 400 }
      );
    }

    const backendUrl = `${apiURL}/api/v1/admin/getDomainTxtRecordById/${domainId}`;

    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await backendRes.json();

    return NextResponse.json(
      { success: backendRes.ok, data },
      { status: backendRes.status }
    );
  } catch (error: any) {
    console.error("Next proxy error:", error);
    return NextResponse.json(
      { success: false, message: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
