import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("Missing invoice id.", 400);

    // ✅ Forward Bearer token
    const auth = req.headers.get("authorization") || "";

    const upstream = await fetch(
      `${apiURL}/api/v1/user/download_invoice/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          ...(auth ? { Authorization: auth } : {}),
          Accept: "application/pdf,application/octet-stream,*/*",
        },
        cache: "no-store",
      }
    );

    // If backend returns JSON errors, pass through as text/json
    const contentType = upstream.headers.get("content-type") || "";

    // ✅ Handle unauthorized
    if (upstream.status === 401) {
      const txt = await upstream.text().catch(() => "");
      return new NextResponse(txt || "Unauthorized", {
        status: 401,
        headers: { "content-type": contentType || "text/plain; charset=utf-8" },
      });
    }

    // ✅ If not ok, return same body
    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => "");
      return new NextResponse(txt || "Upstream error", {
        status: upstream.status,
        headers: { "content-type": contentType || "text/plain; charset=utf-8" },
      });
    }

    // ✅ PDF download: return bytes
    const bytes = await upstream.arrayBuffer();

    // Pass-through filename if backend sends it, else fallback
    const cd = upstream.headers.get("content-disposition");
    const filename = `${id}_invoice.pdf`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentType || "application/pdf",
        "content-disposition": cd || `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}