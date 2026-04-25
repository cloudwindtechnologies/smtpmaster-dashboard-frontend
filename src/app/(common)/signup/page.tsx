"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/components/app_component/common/toastHelper";
import { normalizeRole, setTabSession } from "@/lib/auth";
import Image from "next/image";
import ReCAPTCHA from "react-google-recaptcha";

// Helper functions for pending redirect - MOVE THESE OUTSIDE THE COMPONENT
function setPendingRedirect(path: string | null) {
  if (typeof window === "undefined") return;
  if (!path) return;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return;
  if (path.includes("\n") || path.includes("\r")) return;
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

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setPendingRedirect(redirect);
    }
  }, []);
  
  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email");
      return false;
    }

    if (!formData.password.trim()) {
      setError("Password is required");
      return false;
    }
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!passwordRegex.test(formData.password)) {
    setError("Enter at least 8 characters with a combination of letters, numbers and punctuation marks (such as ! and &).");
    showToast('error',error);
    return false;
  }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const routeByWhereTogo = (wheretogo: string) => {
    const routes: Record<string, string> = {
      statp2: "/signup/step-2",
      statp3: "/signup/step-3",
      statp4: "/signup/step-4",
      statp5: "/signup/step-5",
      statp7: "/signup/step-7",
      dashboard: "/",
    };

    const route = routes[wheretogo] || "/";
    
    const pendingRedirect = getPendingRedirect();
    
    if (pendingRedirect) {
      if (route !== "/") {
        // User needs to complete steps, pass redirect to first step
        router.push(`${route}?redirect=${encodeURIComponent(pendingRedirect)}`);
      } else {
        // User is fully onboarded, go directly to pending redirect
        clearPendingRedirect();
        router.push(pendingRedirect);
      }
    } else {
      router.push(route);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    if (!captchaToken) {
      setError("Please complete reCAPTCHA");
      showToast("error", "Please complete reCAPTCHA");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          "type": "signup",
          "g-recaptcha-response": captchaToken,
        }),
      });

      const data = await res.json();
      const errorMessage =
        data?.message || data?.error?.email?.[0] || data?.error || "Signup failed";
      
      if (!res.ok || !data?.token) {
        setError(errorMessage);
        showToast("error", errorMessage);
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      const normalizedRole = normalizeRole(data.role) || "user";

      localStorage.removeItem("superadmin_token");
      localStorage.removeItem("superadmin_role");
      localStorage.removeItem("admin_token_backup");
      localStorage.removeItem("is_impersonating");
      localStorage.removeItem("impersonated_user_id");
      localStorage.removeItem("imp_user_id");
      sessionStorage.removeItem("impersonate_token");
      sessionStorage.removeItem("is_impersonated");
      sessionStorage.removeItem("impersonated_user_id");

      localStorage.removeItem("gmail");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user_token", data.token);
      localStorage.setItem("role", normalizedRole);
      if (data.wheretogo) {
        localStorage.setItem("wheretogo", data.wheretogo);
      }
      setTabSession("user");
      sessionStorage.setItem("auth_bootstrapping", "1");

      // Store user info for onboarding
      if (data.filldata) {
        localStorage.setItem("userData", JSON.stringify(data.filldata));
      }

      // Only token cookie for middleware
      document.cookie = `token=${encodeURIComponent(String(data.token))}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      // Route to appropriate step
      routeByWhereTogo(data.wheretogo);
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
      showToast('error', "Something went wrong. Please try again.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f6fb] flex items-center justify-center">
      <div className="relative w-[70%] h-full" style={{ transform: 'scale(0.8)', transformOrigin: 'center center' }}>
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
                              <p className="text-[10px] text-gray-500">Fast Setup</p>
                              <p className="mt-1 text-[22px] font-bold leading-none text-gray-900">2 Min</p>
                              <p className="mt-1 text-[10px] text-green-600">Quick onboarding</p>
                            </div>

                            <div className="rounded-2xl bg-white/90 p-3 shadow-lg">
                              <p className="text-[10px] text-gray-500">Trusted By</p>
                              <p className="mt-1 text-[22px] font-bold leading-none text-gray-900">1K+</p>
                              <p className="mt-1 text-[10px] text-gray-500">Growing users</p>
                            </div>

                            <div className="col-span-2 rounded-[18px] bg-white p-3.5 shadow-xl">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[15px] font-semibold text-gray-800">Account Benefits</p>
                                  <p className="mt-1 text-[10px] text-gray-500">Start with a secure SMTPMaster account</p>
                                </div>
                                <div className="rounded-full bg-[#fff1e6] px-2.5 py-1 text-[10px] font-semibold text-[#ff7800]">New</div>
                              </div>

                              <div className="mt-3.5 flex items-center gap-3">
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#ff8a1a]">
                                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-center">
                                    <div>
                                      <p className="text-[9px] text-gray-500">Secure</p>
                                      <p className="text-sm font-bold text-gray-900">100%</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-[11px] text-gray-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff7800]" />
                                    Create your account instantly
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                                    Access your SMTP dashboard
                                  </div>
                                  <div className="rounded-2xl bg-[#fff4ec] px-3 py-2 text-[11px] font-medium leading-relaxed text-[#d96500]">
                                    Manage campaigns, SMTP, users, plans and reports in one place.
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

                    <div className="text-center text-white">
                      <h2 className="text-[26px] font-bold leading-tight xl:text-[30px]">
                        Create your SMTPMaster<br />account in seconds.
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Right Signup Panel */}
                <div className="flex h-full items-center justify-center bg-white px-5 py-5 sm:px-7 lg:px-8">
                  <div className="w-full max-w-[380px]">
                    <div className="mb-5">
                      <div className=" flex justify-center">
                      <Image
                          src="/LoginLogo.png"
                          alt="SMTP Master"
                          width={120}
                          height={32}
                          className="w-[13rem] object-contain"
                          priority
                          unoptimized
                        />
                      </div>

                      <h1 className="text-center text-[26px] font-bold tracking-tight mt-2 text-gray-900">Create Account</h1>
                      <p className="mt-1 text-center text-[18px] text-gray-500">Join SMTPMaster and start sending emails</p>
                    </div>

                    <form onSubmit={onSignup} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                          <input
                            name="email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={loading}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                          <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={loading}
                            minLength={5}
                            maxLength={20}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#ff7800]"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="mt-1 text-[13px] text-gray-500">8-20 characters</p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                          <input
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            disabled={loading}
                            minLength={5}
                            maxLength={20}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#ff7800]"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                          onChange={(token) => setCaptchaToken(token)}
                          onExpired={() => setCaptchaToken(null)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-4 text-lg font-semibold text-white transition hover:bg-[#e66c00] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                        {loading ? "Creating account..." : "Create account"}
                      </button>
                    </form>

                    <div className="mt-5">
                      <p className="text-center text-[18px] text-gray-500">
                        Already registered? <Link href="/login" className="font-semibold text-[#ff7800] transition hover:text-[#e66c00]">Login Instead</Link>
                      </p>
                    </div>

                    <div className="mt-7 text-center text-sm text-gray-400">© SMTPMaster. All rights reserved.</div>
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
