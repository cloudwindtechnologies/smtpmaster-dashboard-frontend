import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  
) {
  try {
    const { searchParams } = new URL(req.url)
   const reqId = searchParams.get("id");

    console.log(reqId);
    
    // Get token from request headers (client sends to Next backend)
    const authHeader = req.headers.get("authorization") || "";

    const res = await fetch(`${apiURL}/api/v1/admin/getuserById/${reqId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader, // forward Bearer token
      },
      
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
