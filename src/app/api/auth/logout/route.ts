import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
      const response = NextResponse.json(
        { code: 401, message: "Missing token" },
        { status: 401 }
      );

      response.cookies.set("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
      });

      return response;
    }

    const laravelRes = await fetch(`${apiURL}/api/v1/logout`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
      cache: "no-store",
    });

    const data = await laravelRes.json().catch(() => ({}));

    const response = NextResponse.json(data, { status: laravelRes.status });

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (e: any) {
    const response = NextResponse.json(
      { code: 500, message: e?.message || "Server error" },
      { status: 500 }
    );

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  }
}