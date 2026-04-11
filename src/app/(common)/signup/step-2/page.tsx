"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { token as getToken } from "@/components/app_component/common/http";
import { showToast } from "@/components/app_component/common/toastHelper";
import Image from "next/image";

// Helper functions for pending redirect
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

function getRouteFromWhereToGo(wheretogo: string | null | undefined) {
  const routes: Record<string, string> = {
    statp2: "/signup/step-2",
    statp3: "/signup/step-3",
    statp4: "/signup/step-4",
    statp5: "/signup/step-5",
    statp7: "/signup/step-7",
    dashboard: "/",
  };

  return routes[wheretogo || ""] || "/";
}

// Function to update user stage - calls backend to calculate and get fresh JWT
async function updateUserStage() {
  try {
    const response = await fetch("/api/auth/update-stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();

      // Update token if backend returns new one
      if (data.token) {
        document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        localStorage.setItem("token", data.token);
        localStorage.setItem("user_token", data.token);
        return data.wheretogo;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to update stage:", error);
    return null;
  }
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f6fb]" />}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
    const redirect = searchParams.get("redirect");
    if (redirect && redirect !== "/" && !redirect.includes("_rsc")) {
      setPendingRedirect(redirect);
    }
  }, [searchParams]);

  useEffect(() => {
    const stored = localStorage.getItem("gmail") || "";
    setEmail(stored || "example@gmail.com");
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ dest: email, otp, type: "email" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Invalid OTP");

      showToast("success", data?.message || "Email verified!");

      // Update token if backend returns new one from verification
      if (data.token) {
        document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        localStorage.setItem("token", data.token);
        localStorage.setItem("user_token", data.token);
      }

      // IMPORTANT: Call updateStage to get fresh JWT with calculated wheretogo
      const wheretogo = await updateUserStage();

      const nextRoute = getRouteFromWhereToGo(wheretogo);
      const pendingRedirect = getPendingRedirect();

      setTimeout(() => {
        if (pendingRedirect && nextRoute !== "/") {
          window.location.href = `${nextRoute}?redirect=${encodeURIComponent(pendingRedirect)}`;
        } else if (pendingRedirect) {
          window.location.href = pendingRedirect;
        } else {
          window.location.href = nextRoute;
        }
      }, 100);
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Verification failed");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendLoading(true);

    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dest: email, type: "email" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to resend");

      showToast("success", "Code resent!");
      setCooldown(60);
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Resend failed");
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (changeEmailLoading) return;

    setChangeEmailLoading(true);

    const pendingRedirect = getPendingRedirect();
    const authToken = getToken();

    try {
      if (authToken) {
        await fetch("/api/auth/logout", {
          method: "GET",
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user_token");
      localStorage.removeItem("role");
      localStorage.removeItem("wheretogo");
      localStorage.removeItem("userData");
      localStorage.removeItem("filldata");
      localStorage.removeItem("gmail");

      sessionStorage.removeItem("tab_session");
      sessionStorage.removeItem("auth_bootstrapping");
      sessionStorage.removeItem("onboarding_filldata");

      document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";

      const target = pendingRedirect
        ? `/signup?redirect=${encodeURIComponent(pendingRedirect)}`
        : "/signup";

      window.location.href = target;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-15 w-15 items-center justify-center rounded-xl bg-white">
                <Image src="/Logoicon.png" alt="Logo" width={40} height={20} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">Verify Email</h1>
                <p className="text-sm text-white/90">Step 2 of 7: Complete this step to continue</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4">
              <p className="text-sm text-gray-700">
                We sent a code to <span className="font-semibold text-gray-900">{maskedEmail}</span>
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Wrong email?{" "}
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={changeEmailLoading}
                  className="font-semibold text-[#ff7800] hover:underline"
                >
                  {changeEmailLoading ? "Changing..." : "Change it"}
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
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-[#ff7800] focus:ring-4 focus:ring-[#ff7800]/10"
                />
                <p className="mt-1.5 text-xs text-gray-500">Check inbox or spam folder</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || cooldown > 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {resendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend code"}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff7800] px-6 text-sm font-semibold text-white hover:bg-[#e66c00] disabled:opacity-60"
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
