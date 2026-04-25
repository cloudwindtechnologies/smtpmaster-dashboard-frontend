import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

type RegisterBackendResponse = {
  success?: boolean;
  token?: string;
  role?: string | number;
  message?: unknown;
  error?: unknown;
  wheretogo?: string;
  filldata?: unknown;
};

function getBackendMessage(data: RegisterBackendResponse): string {
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

  return "Signup failed";
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

    const res = await fetch(`${apiURL}/api/v1/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    let data: RegisterBackendResponse;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Backend returned non-JSON response:", text.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "Backend returned invalid response" },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        ...data,
        success: res.ok && Boolean(data?.token),
        message: res.ok && data?.token ? data.message : getBackendMessage(data),
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
