"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Globe, Loader2, User } from "lucide-react";
import { showToast } from "@/components/app_component/common/toastHelper";
import { token as getToken } from "@/components/app_component/common/http";
import {
  getRouteFromWhereToGo,
  refreshOnboardingStage,
} from "@/lib/onboarding";

type FormState = {
  first_name: string;
  last_name: string;
  country: string;
  website: string;
};

function setPendingRedirect(path: string | null) {
  if (typeof window === "undefined") return;
  if (!path) return;
  if (!path.startsWith("/")) return;
  if (path.startsWith("//")) return;
  if (path.includes("://")) return;
  if (path === "/login" || path.startsWith("/login?")) return;
  if (path === "/signup" || path.startsWith("/signup")) return;

  sessionStorage.setItem("pending_redirect", path);
}

function getPendingRedirect() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("pending_redirect");
}

function getSafeRedirectFromUrl() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  if (!redirect) return null;
  if (!redirect.startsWith("/")) return null;
  if (redirect.startsWith("//")) return null;
  if (redirect.includes("://")) return null;
  if (redirect.includes("\n") || redirect.includes("\r")) return null;
  if (redirect === "/") return null;
  if (redirect.includes("_rsc")) return null;
  if (redirect === "/login" || redirect.startsWith("/login?")) return null;
  if (redirect === "/signup" || redirect.startsWith("/signup")) return null;

  return redirect;
}

function saveRedirectFromUrlIfAny() {
  const redirect = getSafeRedirectFromUrl();
  if (redirect) {
    setPendingRedirect(redirect);
  }
}

export default function ProfileSetupPage() {
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    country: "",
    website: "",
  });

  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveRedirectFromUrlIfAny();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // keep if dropdown added later
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.first_name.trim()) {
      showToast("error", "First name is required");
      return false;
    }
    if (!form.last_name.trim()) {
      showToast("error", "Last name is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const authToken = getToken();

      if (!authToken) {
        throw new Error("Session expired. Please login again.");
      }

      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Something went wrong");
      }

      showToast("success", data?.message || "Profile updated successfully!");

      // Call updateStage to get fresh JWT with calculated wheretogo
      const wheretogo = await refreshOnboardingStage();

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
      const message = err instanceof Error ? err.message : "Server error";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    const authToken = getToken();

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }).catch(() => {});
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
      sessionStorage.removeItem("impersonate_token");

      document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      document.cookie = "role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "role=; Path=/; Max-Age=0; SameSite=Lax";

      window.location.replace("/login?error=session_expired");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="bg-[#ff7800] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <Image
                  src="/Logoicon.png"
                  alt="SMTPMaster Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">
                  Profile Setup
                </h1>
                <p className="text-sm text-white/90">
                  Step 3 of 7: Complete your profile information
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  First name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="first_name"
                    required
                    placeholder="First name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Last name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="last_name"
                    required
                    placeholder="Last name"
                    value={form.last_name}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                  />
                </div>
              </div>

       

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    name="website"
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Updating..." : "Update & Continue"}
                </button>
              </div>
            </form>

            <div className="mt-5 text-center text-sm text-gray-500">
              Token expired?{" "}
              <button
                type="button"
                onClick={handleResetSession}
                className="font-semibold text-[#ff7800] hover:underline"
              >
                 login again
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}
