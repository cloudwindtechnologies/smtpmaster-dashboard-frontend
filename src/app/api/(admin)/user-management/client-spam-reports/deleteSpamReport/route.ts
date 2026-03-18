import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    // 🔐 Get token
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Get ID from search params
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Spam report ID is required" },
        { status: 422 }
      );
    }

    // 🔁 Call Laravel backend
    const res = await fetch(`${apiURL}/api/v1/admin/deleteSpamReport/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Delete failed" },
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
