import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, new_password, confirm_password } = body;

    // Basic validation
    if (!email || !otp || !new_password || !confirm_password) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        {
          success: false,
          message: "Passwords do not match",
        },
        { status: 400 }
      );
    }

    const res = await fetch(`${apiURL}/api/v1/user/forgotPasswordReset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        otp: otp.trim(),
        new_password,
        confirm_password,
      }),
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: res.ok,
        message:
          data.message ||
          (res.ok
            ? "Password reset successfully. You can now login."
            : "Reset failed."),
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