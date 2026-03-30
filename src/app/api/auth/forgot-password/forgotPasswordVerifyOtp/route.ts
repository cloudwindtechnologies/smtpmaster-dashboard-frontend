import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    // Basic validation
    if (!email || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and OTP are required",
        },
        { status: 400 }
      );
    }

    const res = await fetch(`${apiURL}/api/v1/user/forgotPasswordVerifyOtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        otp: otp.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: res.ok,
        message:
          data.message ||
          (res.ok
            ? "OTP verified successfully."
            : "Invalid OTP."),
        data,
      },
      { status: res.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}