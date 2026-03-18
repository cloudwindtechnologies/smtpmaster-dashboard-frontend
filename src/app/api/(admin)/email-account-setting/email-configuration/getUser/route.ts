import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Token not found" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const page = searchParams.get("page") ?? "1";
    const per_page = searchParams.get("per_page") ?? "10";
    const q = searchParams.get("q");

    // ✅ Build backend URL safely
    const backendUrl = new URL(`${apiURL}/api/v1/admin/getuser`);
    backendUrl.searchParams.set("page", page);
    backendUrl.searchParams.set("per_page", per_page);

    if (q && q.trim() !== "") {
      backendUrl.searchParams.set("q", q);
    }

    const backendRes = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await backendRes.json().catch(() => null);

    return NextResponse.json(
      {
        success: backendRes.ok,
        data,
      },
      { status: backendRes.status }
    );
  } catch (error) {
    console.error("GET_USER_API_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
