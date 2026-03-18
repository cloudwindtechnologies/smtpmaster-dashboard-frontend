import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    // 🔐 Get token from request header
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (!body?.edit_for) {
      return NextResponse.json(
        { message: "edit_for (domain id) is required" },
        { status: 422 }
      );
    }

    const res = await fetch(`${apiURL}/api/v1/admin/editDomainTxtRecordById`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader, 
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Update failed", errors: data?.errors },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
