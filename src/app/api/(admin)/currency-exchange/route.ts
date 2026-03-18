import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request
) {
  try {
    // 1️⃣ Read Authorization header from frontend request
    const auth =
      req.headers.get("authorization") ||
      req.headers.get("Authorization");

    if (!auth) {
      return NextResponse.json(
        {
          message: "Unauthorized",
          errors: { authorization: ["Missing Bearer token"] },
        },
        { status: 401 }
      );
    }

    // 2️⃣ Parse body safely
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        {
          message: "Invalid JSON body",
          errors: { body: ["JSON body is required"] },
        },
        { status: 400 }
      );
    }

    // 3️⃣ Validate required fields
    if (payload.value === undefined || payload.type === undefined) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: {
            type: ["type is required"],
            value: ["value is required"],
          },
        },
        { status: 422 }
      );
    }

    // 4️⃣ Forward request to Laravel backend
    const backendRes = await fetch(
      `${apiURL}/api/v1/admin/crs/1`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: auth, // ✅ forward token
        },
        body: JSON.stringify({
          type: payload.type,
          value: Number(payload.value), // ✅ force integer
        }),
      }
    );

    const data = await backendRes.json();

    // 5️⃣ Forward backend response as-is
    return NextResponse.json(data, {
      status: backendRes.status,
    });
  } catch (error: any) {
    console.error("CR update error:", error);

    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}
