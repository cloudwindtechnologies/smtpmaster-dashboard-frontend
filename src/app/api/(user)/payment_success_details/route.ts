import { apiURL, token } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoice_id");

    if (!invoiceId) {
      return jsonError("Missing invoice_id", 400);
    }


    const upstream = await fetch(
      `${apiURL}/api/v1/user/payment_success_details/${encodeURIComponent(invoiceId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token()}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await upstream.text();
    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return jsonError("Invalid upstream response", 500);
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}