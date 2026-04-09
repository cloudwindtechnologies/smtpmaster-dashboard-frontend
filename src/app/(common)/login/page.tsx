"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { normalizeRole, setSuperadminSession, setTabSession } from "@/lib/auth";
import { showToast } from "@/components/app_component/common/toastHelper";

type LoginResponse = {
  token?: string;
  role?: string;
  wheretogo?: string;
  success?: boolean;
  message?: string;
  gmail?: string;
  
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

// Create a separate component that uses useSearchParams

function LoginForm() {
  const searchParams = useSearchParams();
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

function clearPendingRedirect() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("pending_redirect");
}

  const redirectFromUrl = useMemo(() => {
    const redirect = searchParams.get("redirect");
    return isSafeRedirectPath(redirect) ? redirect : null;
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
  if (redirectFromUrl) {
    setPendingRedirect(redirectFromUrl);
  }
}, [redirectFromUrl]);

const onLogin = async (e: React.FormEvent) => {
  e.preventDefault();
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
      showToast('error', data?.message || "Login failed");
      return;
    } else {
      showToast("success", data.message || 'login success');
    }

    const role = normalizeRole(data.role) || "";

    if (role !== "superadmin") {
      localStorage.setItem("user_token", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", role);
      setTabSession("user");
    } else {
      localStorage.setItem("superadmin_token", data.token);
      localStorage.setItem("token", data.token);
      setSuperadminSession(data.token, role);
    }

    localStorage.setItem("gmail", email || "");
    if (data.wheretogo) {
      localStorage.setItem("wheretogo", data.wheretogo);
    }
    sessionStorage.setItem("auth_bootstrapping", "1");

    // ❌ REMOVE THIS LINE - Server sets HTTP-only cookie, not client!
    // document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    window.dispatchEvent(new Event("user-login"));

    if (redirectFromUrl) {
      setPendingRedirect(redirectFromUrl);
    }
    
    const fallbackRedirect = getRedirectPathFromWhereToGo(data.wheretogo);
    const isUnfinished = fallbackRedirect.startsWith("/signup/");
    const pendingRedirect = getPendingRedirect();

    // unfinished user must finish steps first
    if (isUnfinished) {
      if (pendingRedirect) {
        window.location.replace(
          `${fallbackRedirect}?redirect=${encodeURIComponent(pendingRedirect)}`
        );
      } else {
        window.location.replace(fallbackRedirect);
      }
      return;
    }

    // finished user goes to pasted page if available
    if (pendingRedirect) {
      clearPendingRedirect();
      window.location.replace(pendingRedirect);
      return;
    }

    window.location.replace(fallbackRedirect);
     
  } catch (error) {
    console.log(error);
    showToast('error', "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};
    const signupHref = useMemo(() => {
    return redirectFromUrl
      ? `/signup?redirect=${encodeURIComponent(redirectFromUrl)}`
      : "/signup";
    }, [redirectFromUrl]);

  return (
    
    <div className="h-screen w-screen overflow-hidden bg-[#f4f6fb] flex items-center justify-center">
      <div className="relative w-[70%] h-full transform scale-[0.8] origin-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[1180px] h-[110vh] max-h-[900px]">
            <div className="h-full w-full overflow-hidden rounded-[22px] bg-white shadow-[0_16px_50px_rgba(0,0,0,0.10)]">
              <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_0.96fr]">
                {/* Left Branding Panel */}
                <div className="relative hidden overflow-hidden bg-[#ff7800] lg:block">
                  <div className="absolute inset-0">
                    <div className="absolute -left-20 -top-14 h-44 w-44 rounded-full bg-white/10" />
                    <div className="absolute right-[-60px] top-16 h-52 w-52 rounded-full bg-white/10" />
                    <div className="absolute bottom-[-90px] left-8 h-56 w-56 rounded-full border border-white/10" />
                    <div className="absolute bottom-8 right-8 h-32 w-32 rounded-full border border-white/10" />
                  </div>

                  <div className="relative z-10 flex h-full flex-col justify-between p-5 xl:p-6">
                    <div className="flex flex-1 items-center justify-center">
                      <div className="relative w-full max-w-[330px] xl:max-w-[350px]">
                        <div className="rounded-[20px] bg-white/14 p-3 shadow-2xl backdrop-blur-sm">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="rounded-2xl bg-white p-3 shadow-lg">
                              <p className="text-[10px] text-gray-500">Deliverability</p>
                              <p className="mt-1 text-[22px] font-bold leading-none text-gray-900">98%</p>
                              <p className="mt-1 text-[10px] text-green-600">+4.2% this month</p>
                            </div>

                            <div className="rounded-2xl bg-white/90 p-3 shadow-lg">
                              <p className="text-[10px] text-gray-500">Active Sending</p>
                              <p className="mt-1 text-[22px] font-bold leading-none text-gray-900">24K</p>
                              <p className="mt-1 text-[10px] text-gray-500">Emails processed</p>
                            </div>

                            <div className="col-span-2 rounded-[18px] bg-white p-3.5 shadow-xl">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[15px] font-semibold text-gray-800">Campaign Performance</p>
                                  <p className="mt-1 text-[10px] text-gray-500">Transactional and bulk email insights</p>
                                </div>
                                <div className="rounded-full bg-[#fff1e6] px-2.5 py-1 text-[10px] font-semibold text-[#ff7800]">Live</div>
                              </div>

                              <div className="mt-3.5 flex items-center gap-3">
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#ff8a1a]">
                                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-center">
                                    <div>
                                      <p className="text-[9px] text-gray-500">Open Rate</p>
                                      <p className="text-sm font-bold text-gray-900">75%</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-[11px] text-gray-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff7800]" />
                                    High inbox placement
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                                    Better sender reputation
                                  </div>
                                  <div className="rounded-2xl bg-[#fff4ec] px-3 py-2 text-[11px] font-medium leading-relaxed text-[#d96500]">
                                    Manage campaigns, SMTP, logs and users from one place.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="absolute -right-3 top-7 rounded-full border-4 border-white bg-white p-1 shadow-lg">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f2937] text-[9px] font-bold text-white">24/7</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Login Panel */}
                <div className="flex h-full items-center justify-center bg-white px-5 py-5 sm:px-7 lg:px-8">
                  <div className="w-full max-w-[380px]">
                    <div className="mb-5">
                      <div className="mb-4 flex justify-center">
                        <img src="/LoginLogo.png" alt="SMTP Master" className="h-auto max-h-[64px] w-auto object-contain" />
                      </div>

                      <h1 className="text-center text-[26px] font-bold tracking-tight text-gray-900">Welcome back!</h1>
                      <p className="mt-1 text-center text-[14px] text-gray-500">Enter your credentials to access your SMTPMaster account.</p>
                    </div>

                    <form onSubmit={onLogin} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
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
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
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
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <Link href="/forgot_password" className="text-sm font-medium text-[#ff7800] transition hover:text-[#e66c00]">Forgot your password?</Link>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loading ? <><Loader2 className="h-5 w-5 animate-spin" /><span>Signing in...</span></> : <span>Login</span>}
                      </button>
                    </form>

                    <div className="mt-5">
                      <p className="text-center text-sm text-gray-500">
                        Not registered yet? <Link href={signupHref} className="font-semibold text-[#ff7800] hover:text-[#e66c00]">Create an Account</Link>
                      </p>
                    </div>

                    <div className="mt-7 text-center text-xs text-gray-400">© SMTPMaster. All rights reserved.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#f4f6fb]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff7800]" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
