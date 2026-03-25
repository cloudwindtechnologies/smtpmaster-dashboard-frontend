import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization token missing",
        },
        { status: 401 }
      );
    }

    const res = await fetch(`${apiURL}/api/v1/rezpaykey`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.code !== 200 || !data?.data?.apikey) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Unable to fetch Razorpay key.",
        },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        apikey: data.data.apikey,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}