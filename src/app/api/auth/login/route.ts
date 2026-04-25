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

function getBackendMessage(data: LoginBackendResponse): string {
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (data.error && typeof data.error === "object") {
    for (const value of Object.values(data.error as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }

      if (Array.isArray(value)) {
        const firstText = value.find(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        );

        if (firstText) {
          return firstText;
        }
      }
    }
  }

  return "Invalid login response from backend";
}

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

    const r = await fetch(`${apiURL}/api/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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

    if (!r.ok || !data?.token) {
      return NextResponse.json(
        { success: false, message: getBackendMessage(data) },
        { status: r.status || 401 }
      );
    }

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

    return response;
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
