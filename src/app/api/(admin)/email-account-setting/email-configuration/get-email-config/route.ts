// app/api/v1/admin/getemailConfig/route.ts
import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UpstreamRow = {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export async function GET(req: Request) {
  try {
    // pass through Bearer token to Laravel
    const auth = req.headers.get("authorization") || "";

    const upstream = await fetch(`${apiURL}/api/v1/admin/getemailConfig`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: auth,
      },
      cache: "no-store",
    });

    const json = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return NextResponse.json(json, { status: upstream.status || 500 });
    }

    // keep same response shape your frontend expects
    // { email_config: [...] }
    const email_config: UpstreamRow[] = json?.email_config ?? [];
    return NextResponse.json({ email_config }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Failed to load users", error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
