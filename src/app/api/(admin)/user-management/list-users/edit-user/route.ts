import { apiURL } from "@/components/app_component/common/http"
import { NextResponse } from "next/server";

export async function PUT(req:Request){
    try {
        const authorization=req.headers.get('authorization') || "";
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get("id");
        const body = await req.json();
        const res=await fetch(`${apiURL}/api/v1/admin/updateprofileByAdmin/${userId}`,{
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify(body),
      })
      const data=await res.json().catch(()=>({}));
      return NextResponse.json(data,{status:res.status});

    } catch (err: any) {
        console.error("Next API error (update-user):", err);
        return NextResponse.json(
            { message: err?.message || "Internal Server Error" },
            { status: 500 }
         );
  }
}