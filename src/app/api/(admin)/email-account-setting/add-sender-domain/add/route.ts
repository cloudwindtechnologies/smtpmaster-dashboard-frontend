import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    // 1) Auth check (because your frontend sends Bearer token)
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Unauthorized", errors: { authorization: ["Missing Bearer token"] } },
        { status: 401 }
      );
    }

    // 2) Parse JSON
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        { message: "Invalid JSON body", errors: { body: ["JSON body is required"] } },
        { status: 400 }
      );
    }

    // 3) Minimal validation (match your required fields)
    const errors: Record<string, string[]> = {};
    const isEmpty = (v: any) => v === null || v === undefined || String(v).trim() === "";

    if (isEmpty(payload.user_id)) errors.user_id = ["Client is required"];
    if (isEmpty(payload.domain_name)) errors.domain_name = ["Domain is required"];
    if (isEmpty(payload.spf_record)) errors.spf_record = ["SPF record is required"];
    if (isEmpty(payload.dkim_record)) errors.dkim_record = ["DKIM record is required"];
    if (isEmpty(payload.dkim_private_key)) errors.dkim_private_key = ["DKIM private key is required"];
    if (isEmpty(payload.dmarc_record)) errors.dmarc_record = ["DMARC record is required"];

    if (Object.keys(errors).length) {
      return NextResponse.json({ message: "Validation error", errors }, { status: 422 });
    }
    const upstreamRes = await fetch(`${apiURL}/api/v1/admin/addDomain`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth, // forward same token
      },
      body: JSON.stringify(payload),
    });

    const data = await upstreamRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error", errors: { server: ["Unexpected error"] } },
      { status: 500 }
    );
  }
}
