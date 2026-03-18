import { apiURL } from "@/components/app_component/common/http";
import { NextResponse } from "next/server";

export async function GET(request:Request){
    try {
        const auth=request.headers.get('authorization') || "";
        const res=await fetch(`${apiURL}/api/v1/getcountry`,{
            method:"GET",
            headers:{
                'Content-Type':"application/json",
                Authorization:auth
            }
        })
        const data = await res.json().catch(() => ({}))
        return NextResponse.json(data, { status: res.status });

    } catch (err: any) {
        console.error("Country API error:", err);
        return NextResponse.json(
        { message: err?.message || "Internal Server Error" },
        { status: 500 }
        );
    }

}