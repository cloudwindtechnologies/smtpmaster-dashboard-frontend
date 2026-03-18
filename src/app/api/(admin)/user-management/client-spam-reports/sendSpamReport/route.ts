import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body?.user_id || !body?.title || !body?.content) {
      return NextResponse.json(
        { message: "Recipient, title and content are required" },
        { status: 422 }
      );
    }

    // 🔁 Call Laravel backend
    const res = await fetch(`${apiURL}/api/v1/admin/sendSpamReport`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader, // forward token
      },
      body: JSON.stringify({
        user_id: body.user_id,
        title: body.title,
        content: body.content,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to send spam report" },
        { status: res.status }
      );
    }

    // ✅ Return Laravel response as-is
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
