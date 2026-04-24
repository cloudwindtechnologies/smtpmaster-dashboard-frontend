import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, error: "Server error", details: e?.message },
      { status: 500 }
    );
  }
}
