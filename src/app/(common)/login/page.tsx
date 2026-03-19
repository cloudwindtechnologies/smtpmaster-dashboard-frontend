"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { setSuperadminSession, setTabSession } from "@/lib/auth";

type LoginResponse = {
  token?: string;
  role?: string;
  wheretogo?: string;
  success?: boolean;
  message?: string;
};

function getRedirectPathFromWhereToGo(wheretogo?: string | null): string {
  const key = (wheretogo || "").toLowerCase().trim();

  const stageToStep: Record<string, number> = {
    statp2: 2,
    statp3: 3,
    statp4: 4,
    statp5: 5,
    statp7: 7,
  };

  if (key === "dashboard") return "/";

  const step = stageToStep[key];
  if (step) return `/signup/step-${step}`;

  return "/";
}

function isSafeRedirectPath(path: string | null): boolean {
  if (!path) return false;

  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("://")
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          "g-recaptcha-response": 1,
          type: "login",
           client_user_agent: navigator.userAgent,
        }),
      });

      const data = (await res.json()) as LoginResponse;

      if (!res.ok || !data?.success || !data?.token) {
        setMsg(data?.message || "Login failed");
        return;
      }

      const role = data.role || "";
      localStorage.setItem("role", role);

      if (role !== "superadmin") {
        localStorage.setItem("user_token", data.token);
        localStorage.setItem("token", data.token);
        setTabSession("user");
      } else {
        localStorage.setItem("superadmin_token", data.token);
        localStorage.setItem("token", data.token);
        setSuperadminSession(data.token, role);
      }

      localStorage.setItem("wheretogo", data.wheretogo || "");

      document.cookie = `token=${encodeURIComponent(
        data.token
      )}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      document.cookie = `role=${encodeURIComponent(
        role
      )}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      window.dispatchEvent(new Event("user-login"));

      // 1st priority = page user originally wanted to visit
      const requestedRedirect = searchParams.get("redirect");

      if (isSafeRedirectPath(requestedRedirect)) {
        router.replace(requestedRedirect as string);
        return;
      }

      // 2nd priority = your existing wheretogo logic
      const redirectTo = getRedirectPathFromWhereToGo(data.wheretogo);
      router.replace(redirectTo);
    } catch (err) {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="h-screen overflow-hidden bg-[#f4f6fb] p-3 sm:p-4">
    <div className="mx-auto flex h-full max-w-6xl items-center justify-center">
      <div className="h-full w-full overflow-hidden rounded-[24px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
        <div className="grid h-full grid-cols-1 lg:grid-cols-[1.02fr_0.98fr]">
          {/* Left Branding Panel */}
          <div className="relative hidden overflow-hidden bg-[#ff7800] lg:block">
            <div className="absolute inset-0">
              <div className="absolute -left-20 -top-14 h-52 w-52 rounded-full bg-white/10" />
              <div className="absolute right-[-70px] top-16 h-60 w-60 rounded-full bg-white/10" />
              <div className="absolute bottom-[-100px] left-8 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute bottom-8 right-8 h-36 w-36 rounded-full border border-white/10" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between p-6 xl:p-8">
              <div className="flex flex-1 items-center justify-center">
                <div className="relative w-full max-w-[360px]">
                  <div className="rounded-[22px] bg-white/14 p-4 shadow-2xl backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white p-3 shadow-lg">
                        <p className="text-[11px] text-gray-500">Deliverability</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          98%
                        </p>
                        <p className="mt-1 text-[11px] text-green-600">
                          +4.2% this month
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/90 p-3 shadow-lg">
                        <p className="text-[11px] text-gray-500">Active Sending</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          24K
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Emails processed
                        </p>
                      </div>

                      <div className="col-span-2 rounded-[20px] bg-white p-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              Campaign Performance
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Transactional and bulk email insights
                            </p>
                          </div>
                          <div className="rounded-full bg-[#fff1e6] px-2.5 py-1 text-[10px] font-semibold text-[#ff7800]">
                            Live
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7800] to-[#ff9d4d]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-center">
                              <div>
                                <p className="text-[10px] text-gray-500">Open Rate</p>
                                <p className="text-base font-bold text-gray-900">
                                  75%
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#ff7800]" />
                              High inbox placement
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                              Better sender reputation
                            </div>
                            <div className="rounded-2xl bg-[#fff4ec] px-3 py-2 text-xs font-medium text-[#d96500]">
                              Manage campaigns, SMTP, logs and users from one place.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -right-3 top-8 rounded-full border-4 border-white bg-white p-1 shadow-lg">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2937] text-[10px] font-bold text-white">
                      24/7
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-white">
                <h2 className="text-2xl font-bold leading-tight xl:text-3xl">
                  Power your email
                  <br />
                  business with confidence.
                </h2>
             
              </div>
            </div>
          </div>

          {/* Right Login Panel */}
          <div className="flex h-full items-center justify-center bg-white px-5 py-6 sm:px-8 lg:px-10">
            <div className="w-full max-w-[390px]">
              <div className="mb-5">
                <div className="mb-4 flex justify-center">
                  <img
                    src="/LoginLogo.png"
                    alt="SMTP Master"
                    className="h-auto max-h-[72px] w-auto object-contain"
                  />
                </div>

                <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]">
                  Welcome back!
                </h1>
                <p className="mt-1 text-center text-sm text-gray-500">
                  Enter your credentials to access your SMTPMaster account.
                </p>
              </div>

              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#ff7800]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    href="/forgot_password"
                    className="text-sm font-medium text-[#ff7800] transition hover:text-[#e66c00]"
                  >
                    Forgot your password?
                  </Link>
                </div>

                {msg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-600">{msg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>
              </form>

              <div className="mt-5">
                <p className="text-center text-sm text-gray-500">
                  Not registered yet?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-[#ff7800] hover:text-[#e66c00]"
                  >
                    Create an Account
                  </Link>
                </p>
              </div>

              <div className="mt-8 text-center text-xs text-gray-400">
                © SMTPMaster. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}