import { NextResponse } from "next/server";
import { apiURL } from "@/components/app_component/common/http";

export async function POST(
  req: Request 
) {
  try {
    
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing userId in route" },
        { status: 400 }
      );
    }

    const auth = req.headers.get("authorization") || "";

    const body = await req.json().catch(() => ({}));
    const start_date = body?.start_date;
    const plan_id = body?.plan_id;

    // basic validation
    if (!start_date || !plan_id) {
      return NextResponse.json(
        { success: false, message: "start_date and plan_id are required" },
        { status: 422 }
      );
    }

    const upstream = await fetch(`${apiURL}/api/v1/admin/addUserPackage/${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify({
        start_date,
        plan_id: Number(plan_id),
      }),
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
