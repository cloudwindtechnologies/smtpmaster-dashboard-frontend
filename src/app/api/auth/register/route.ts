import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

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

    const res = await fetch(`${apiURL}/api/v1/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    const response = NextResponse.json(
      {
        ...data,
        role:
          data?.role === 1 || data?.role === "1" || data?.role === "superadmin"
            ? "superadmin"
            : "user",
      },
      { status: res.status }
    );

    if (res.ok && data?.token) {
      response.cookies.set("token", String(data.token), {
        httpOnly: false,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (e: unknown) {
    return NextResponse.json(
      {
        code: 500,
        error: "Server error",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
