"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {  Loader2, RotateCcw, ArrowLeft } from "lucide-react";
import { token } from "@/components/app_component/common/http";
import { showToast } from "@/components/app_component/common/toastHelper";
import Image from "next/image";

export default function VerifyEmailPage() {
  function setPendingRedirect(path: string | null) {
    if (typeof window === "undefined") return;
    if (!path) return;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return;
    if (path === "/login" || path.startsWith("/login?")) return;
    if (path === "/signup" || path.startsWith("/signup")) return;

    sessionStorage.setItem("pending_redirect", path);
  }

  function getPendingRedirect() {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("pending_redirect");
  }
  
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
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
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setPendingRedirect(redirect);
    }
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/register/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ dest: email, otp:otp, type: "email" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Invalid OTP");
      }
      showToast("success", data?.message || "Email verified successfully!");
      setMessage({ type: "success", text: data?.message || "Email verified successfully!" });

      const pendingRedirect = getPendingRedirect();
       localStorage.setItem("wheretogo", "statp3");
      document.cookie = "wheretogo=statp3; Path=/; Max-Age=604800; SameSite=Lax";
      if (pendingRedirect) {
        router.replace(`/signup/step-3?redirect=${encodeURIComponent(pendingRedirect)}`);
      } else {
        router.replace("/signup/step-3");
      }
    } catch (err: any) {
      showToast('error', err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    
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
      showToast('success', data?.message || "Verification code resent successfully!");
      setCooldown(60); // Set 60 second cooldown
    } catch (err: any) {
      showToast('error', err?.message || "Resend failed");
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
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">

        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          {/* Header with Logo */}
          <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Logo */}
             <div className="flex h-15 w-15  items-center justify-center rounded-xl bg-white">
                <Image 
                    src="/Logoicon.png" 
                    alt="Description" 
                    width={40} 
                    height={20} 
                  />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">
                  Verify Email
                </h1>
                <p className="text-sm text-white/90">
                  Complete this step to continue your account setup
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6">
            <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4">
              <p className="text-sm leading-relaxed text-gray-700">
                We sent a verification code to{" "}
                <span className="font-semibold text-gray-900">{maskedEmail}</span>.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Want to change email?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/signup")}
                  className="font-semibold text-[#ff7800] hover:underline"
                >
                  Edit email
                </button>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Check your inbox or spam folder. It may take a few seconds.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || !email || cooldown > 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {resendLoading 
                    ? "Resending..." 
                    : cooldown > 0 
                    ? `Resend code (${cooldown}s)` 
                    : "Resend code"}
                </button>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}