"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, RotateCcw, ArrowLeft } from "lucide-react";
import { token } from "@/components/app_component/common/http"; // ✅ same as your working code

export default function VerifyEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const maskedEmail = useMemo(() => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const safeName =
      name.length <= 2
        ? name[0] + "*"
        : name.slice(0, 2) + "*".repeat(Math.min(6, name.length - 2));
    return `${safeName}@${domain}`;
  }, [email]);

  useEffect(() => {
    const stored = localStorage.getItem("gmail") || "";
    setEmail(stored || "example@gmail.com");
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // ✅ IMPORTANT: send Bearer token (same as your old working version)
      const res = await fetch("/api/auth/register/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ dest: email, otp, type: "email" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Invalid OTP");
      }

      setMessage({ type: "success", text: data?.message || "Email verified successfully!" });

      // ✅ go next step
      router.replace("/signup/step-3");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Verification failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dest: email, type: "email" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to resend OTP");
      }

      setMessage({ type: "success", text: data?.message || "Verification code resent successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Resend failed" });
    } finally {
      setResendLoading(false);
    }
  };

  // auto-resend after email is loaded
  useEffect(() => {
    if (email) handleResend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mt-5 mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            We sent a verification code to{" "}
            <span className="font-semibold text-gray-900">{maskedEmail}</span>.
            <br />
            Want to change email?{" "}
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="font-semibold text-blue-600 hover:underline"
            >
              Edit email
            </button>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OTP Code <span className="text-red-500">*</span>
            </label>

            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="Enter OTP"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="mt-1 text-xs text-gray-500">
              Check inbox/spam. Its may take a few seconds.
            </p>
          </div>

          {message && (
            <div
              className={[
                "rounded-lg px-3 py-2 text-sm",
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
              ].join(" ")}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || !email}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-60"
            >
              {resendLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {resendLoading ? "Resending..." : "Resend code"}
            </button>

            <button
              type="submit"
              disabled={loading || !email}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}
