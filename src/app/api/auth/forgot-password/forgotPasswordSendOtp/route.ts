import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

type RecaptchaVerifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    const recaptchaToken = body["g-recaptcha-response"];

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    if (!recaptchaToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete reCAPTCHA",
        },
        { status: 400 }
      );
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "reCAPTCHA server config missing",
        },
        { status: 500 }
      );
    }

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
      }).toString(),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify reCAPTCHA",
        },
        { status: 502 }
      );
    }

    const verifyData: RecaptchaVerifyResponse = await verifyRes.json();

    if (!verifyData.success) {
      return NextResponse.json(
        {
          success: false,
          message: "reCAPTCHA verification failed",
        },
        { status: 400 }
      );
    }

    const res = await fetch(`${apiURL}/api/v1/user/forgotPasswordSendOtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: res.ok,
        message:
          data.message ||
          (res.ok ? "OTP sent to your email." : "Failed to send OTP."),
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