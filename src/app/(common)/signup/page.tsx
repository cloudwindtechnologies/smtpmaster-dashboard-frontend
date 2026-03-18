"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { apiURL } from "@/components/app_component/common/http";

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

    if (formData.password.length < 5 || formData.password.length > 20) {
      setError("Password must be between 5 and 20 characters");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiURL}/api/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          "type": "signup",
          "g-recaptcha-response": "1",
        }),
      });

      const data = await res.json();

      if (data.code !== 200) {
        setError(data.error?.email?.[0] || data.error || "Signup failed");
        return;
      }
      if(res.ok){

      }

      // ✅ Store token and user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("gmail", formData.email.toLowerCase());
      localStorage.setItem("role", String(data.role));
      localStorage.setItem("wheretogo", data.wheretogo);

      // Store user info for onboarding
      if (data.filldata) {
        localStorage.setItem("userData", JSON.stringify(data.filldata));
      }

      // 🍪 Set cookies for auth
      document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      document.cookie = `role=${encodeURIComponent(String(data.role))}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      // Dispatch event to refresh user context
      window.dispatchEvent(new Event('user-login'));

      // 🔀 Route to appropriate step
      routeByWhereTogo(data.wheretogo);
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const routeByWhereTogo = (wheretogo: string) => {
    const routes: Record<string, string> = {
      statp2: "/signup/step-2", // Email not verified
      statp3:  "/signup/step-3", // Basic profile
      statp4: "/signup/step-4", // Address
      statp5:"/signup/step-5", // Business info
      statp7: "/signup/step-7", // Mobile verification
      dashboard: "/dashboard", // All complete
    };

    const route = routes[wheretogo] || "/dashboard";
    router.push(route);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

return (
<div className="h-screen overflow-hidden bg-[#f4f6fb] p-2 sm:p-3 md:p-4">
  <div className="mx-auto flex h-full max-w-6xl items-center justify-center">
    <div className="h-full w-full overflow-hidden rounded-[20px] md:rounded-[24px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[1.02fr_0.98fr]">
        {/* Left Branding Panel */}
        <div className="relative hidden overflow-hidden bg-[#ff7800] lg:block">
          <div className="absolute inset-0">
            <div className="absolute -left-20 -top-14 h-52 w-52 rounded-full bg-white/10" />
            <div className="absolute right-[-70px] top-16 h-60 w-60 rounded-full bg-white/10" />
            <div className="absolute bottom-[-100px] left-8 h-64 w-64 rounded-full border border-white/10" />
            <div className="absolute bottom-8 right-8 h-36 w-36 rounded-full border border-white/10" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-5 xl:p-6">
            <div className="flex flex-1 items-center justify-center">
              <div className="relative w-full max-w-[340px]">
                <div className="rounded-[20px] bg-white/14 p-4 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white p-2.5 shadow-lg">
                      <p className="text-[10px] text-gray-500">Fast Setup</p>
                      <p className="mt-0.5 text-xl font-bold text-gray-900">2 Min</p>
                      <p className="mt-0.5 text-[10px] text-green-600">Quick onboarding</p>
                    </div>

                    <div className="rounded-xl bg-white/90 p-2.5 shadow-lg">
                      <p className="text-[10px] text-gray-500">Trusted By</p>
                      <p className="mt-0.5 text-xl font-bold text-gray-900">1K+</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">Growing users</p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-white p-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">Account Benefits</p>
                          <p className="mt-0.5 text-[10px] text-gray-500">Start with a secure SMTPMaster account</p>
                        </div>
                        <div className="rounded-full bg-[#fff1e6] px-2 py-0.5 text-[9px] font-semibold text-[#ff7800]">New</div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7800] to-[#ff9d4d]">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-center">
                            <div>
                              <p className="text-[9px] text-gray-500">Secure</p>
                              <p className="text-sm font-bold text-gray-900">100%</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-[#ff7800]" />
                            Create your account instantly
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-gray-300" />
                            Access your SMTP dashboard
                          </div>
                          <div className="rounded-xl bg-[#fff4ec] px-2 py-1.5 text-[10px] font-medium text-[#d96500] leading-tight">
                            Manage campaigns, SMTP, users, plans and reports in one place.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-white">
              <h2 className="text-xl font-bold leading-tight xl:text-2xl">
                Create your SMTPMaster
                <br />
                account in seconds.
              </h2>

            </div>
          </div>
        </div>

        {/* Right Signup Panel */}
        <div className="flex h-full  items-center justify-center bg-white px-3 py-6 sm:px-5 lg:px-6 overflow-hidden">
          <div className="w-full max-w-[360px] mt-6">
            <div className="mb-4">
              <div className="flex justify-center">
                <img
                  src="/LoginLogo.png"
                  alt="SMTP Master"
                  className="h-auto max-h-[60px] w-auto object-contain"
                />
              </div>

              <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Create Account
              </h1>
              <p className="mt-1 text-center text-xs text-gray-500">
                Join SMTPMaster and start sending emails
              </p>
            </div>

            <form onSubmit={onSignup} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-2 focus:ring-[#ff7800]/10 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                    minLength={5}
                    maxLength={20}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-2 focus:ring-[#ff7800]/10 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#ff7800]"
                  >
                    {showPassword ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-500">5-20 characters</p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                    minLength={5}
                    maxLength={20}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-2 focus:ring-[#ff7800]/10 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#ff7800]"
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="my-4 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">
                  Already registered?
                </span>
              </div>
            </div>

            <Link href="/login">
              <button
                type="button"
                className="w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Sign in instead
              </button>
            </Link>

            <div className="mt-4 text-center text-[10px] text-gray-400">
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
