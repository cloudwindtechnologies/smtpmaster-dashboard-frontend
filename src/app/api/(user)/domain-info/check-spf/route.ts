import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const domainId = req.nextUrl.searchParams.get("domain_id");

    if (!domainId) {
      return NextResponse.json(
        { code: 400, message: "domain_id is required" },
        { status: 400 }
      );
    }

    const token = req.headers.get("authorization");

    const backendRes = await fetch(
      `${apiURL}/api/v1/user/spfValidation/${domainId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: token || "",
        },
        cache: "no-store",
      }
    );

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json(
      { code: 500, message: "SPF check failed" },
      { status: 500 }
    );
  }
}
