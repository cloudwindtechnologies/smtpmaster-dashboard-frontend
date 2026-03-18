import { apiURL } from "@/components/app_component/common/http"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {

    const auth = req.headers.get("authorization") || ""

    const res = await fetch(`${apiURL}/api/v1/get_all_plans`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: "no-store",
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Something went wrong" },
      { status: 500 }
    )
  }
}