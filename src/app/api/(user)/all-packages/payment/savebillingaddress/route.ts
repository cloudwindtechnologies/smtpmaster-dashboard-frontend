import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const body = await req.json();

    if (!authHeader) {
      return NextResponse.json(
        {
          code: 401,
          message: "Unauthorized. Missing token.",
        },
        { status: 401 }
      );
    }

    const response = await fetch(`${apiURL}/api/v1/savebillingaddress`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: authHeader,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        code: response.status,
        message: text || "Invalid response from backend",
      };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 500,
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}