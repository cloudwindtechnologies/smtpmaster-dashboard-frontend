import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const { searchParams } = new URL(req.url);

    const backendUrl = `${apiURL}/api/v1/export_logs?${searchParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "text/csv",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const errJson = await response.json();
        return NextResponse.json(
          {
            code: response.status,
            message: errJson?.message || errJson?.errors || "Failed to export logs",
          },
          { status: response.status }
        );
      }

      const errText = await response.text();
      return NextResponse.json(
        {
          code: response.status,
          message: errText || "Failed to export logs",
        },
        { status: response.status }
      );
    }

    const csvBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "text/csv";
    const contentDisposition =
      response.headers.get("content-disposition") ||
      `attachment; filename="email_logs_${Date.now()}.csv"`;

    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 500,
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}