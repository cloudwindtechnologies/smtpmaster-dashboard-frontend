import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Token not found" },
        { status: 401 }
      );
    }
    

    const backendRes = await fetch(`${apiURL}/api/v1/admin/getsearchAllUsers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      
    });

    const backendJson = await backendRes.json();
    console.log(backendJson);
    
    // ✅ extract list safely (Laravel pagination usually: backendJson.data.data)
    const list =
      backendJson?.data?.data ??
      backendJson?.data ??
      backendJson ??
      [];

    return NextResponse.json(
      { success: true, data: Array.isArray(list) ? list : [] },
      { status: backendRes.status }
    );
  } catch (error) {
    console.log('error',error);
    
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
