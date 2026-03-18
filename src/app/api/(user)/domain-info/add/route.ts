import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ code: 401, message: "Unauthorized", data: null }, { status: 401 });
    }

    const body = await req.json();

    const res = await fetch(`${apiURL}/api/v1/user/addSendingDomain`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, message: e?.message || "Server error", data: null },
      { status: 500 }
    );
  }
}
