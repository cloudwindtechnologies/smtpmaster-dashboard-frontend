import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

type LoginBackendResponse = {
  success?: boolean;
  token?: string;
  role?: string | number;
  message?: unknown;
  error?: unknown;
  wheretogo?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const recaptchaToken = body["g-recaptcha-response"];

if (!recaptchaToken) {
  return NextResponse.json(
    { success: false, message: "Please complete reCAPTCHA" },
    { status: 400 }
  );
}

  const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY || "",
      response: recaptchaToken,
    }).toString(),
  });

  const verifyData = await verifyRes.json();

  if (!verifyData.success) {
    return NextResponse.json(
      { success: false, message: "reCAPTCHA verification failed" },
      { status: 400 }
    );
  }

    const r = await fetch(`${apiURL}/api/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    
    let data: LoginBackendResponse;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Backend returned non-JSON response:", text.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "Backend returned invalid response" },
        { status: 500 }
      );
    }
    
    if (!data?.token) {
      return NextResponse.json(
        { success: false, message: data?.error || "Invalid login response from backend" },
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

  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
