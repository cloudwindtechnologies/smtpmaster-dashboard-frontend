"use server"
import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // { email, password }


    // ✅ Call YOUR backend login API
    // Change this endpoint to your real backend login route
    const r = await fetch(`${apiURL}/api/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    
    
    // backend must return JSON, but sometimes it returns HTML error page
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "Backend returned non-JSON response", raw: text.slice(0, 200) },
        { status: 500 }
      );
    }
    console.log(data);
    
    // ✅ Expected backend response:
    // { success: true, token: "...", role: "admin"|"user" }
    if (!data?.success || !data?.token || !data?.role) {
      return NextResponse.json(
        { success: false, message: data?.error || "Invalid login response from backend", data },
        { status: 401 }
      );
    }
    return NextResponse.json({
      token: data.token || data.access_token,
      role: data.role || data.user?.role,
      wheretogo: data.wheretogo,
      success:data?.success,
      message:data?.message
    });
    // ✅ Set secure httpOnly cookies
    // const res = NextResponse.json({ success: true, role: data.role });

    // res.cookies.set("auth_token", data.token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   path: "/",
    //   maxAge: 60 * 60 * 24 * 7, // 7 days
    // });

    // res.cookies.set("role", data.role, {
    //   httpOnly: true, // keep it safe too
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   path: "/",
    //   maxAge: 60 * 60 * 24 * 7,
    // });

    // return res;

  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
  }
}
