"use server"
import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const r = await fetch(`${apiURL}/api/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "Backend returned non-JSON response", raw: text.slice(0, 200) },
        { status: 500 }
      );
    }
    
    if (!data?.success || !data?.token || !data?.role) {
      return NextResponse.json(
        { success: false, message: data?.error || "Invalid login response from backend", data },
        { status: 401 }
      );
    }

    // ✅ SINGLE RESPONSE with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: data?.message || "Login successful",
      token: data.token,
      role: data.role,
      wheretogo: data.wheretogo,
    });

    response.cookies.set("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response; // ✅ Now we actually return it!

  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
  }
}