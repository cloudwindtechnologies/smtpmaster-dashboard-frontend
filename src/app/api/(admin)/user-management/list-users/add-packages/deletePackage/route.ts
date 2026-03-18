import { NextResponse } from "next/server";
import { apiURL } from "@/components/app_component/common/http";

export async function DELETE(
  req: Request
) {
  try {
    const { searchParams } = new URL(req.url);
    const rowId = searchParams.get("rowId");


    if (!rowId) {
      return NextResponse.json(
        { success: false, message: "Missing rowId in route" },
        { status: 400 }
      );
    }

    // forward bearer token
    const auth = req.headers.get("authorization") || "";
    const ENDPOINT = `/api/v1/admin/deletePackage/${rowId}`;

    const upstream = await fetch(`${apiURL}${ENDPOINT}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
