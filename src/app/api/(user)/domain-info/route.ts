import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization"); // Bearer token from frontend
    if (!auth) {
      return NextResponse.json({ code: 401, message: "Unauthorized", data: null }, { status: 401 });
    }

    const res = await fetch(`${apiURL}/api/v1/user/userDomainInformation`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
      cache: "no-store",
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
