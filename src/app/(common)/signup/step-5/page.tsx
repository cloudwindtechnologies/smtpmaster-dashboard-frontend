"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Users, Contact, ShoppingCart, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { showToast } from "@/components/app_component/common/toastHelper";
import { token as getToken } from "@/components/app_component/common/http";
import {
  getRouteFromWhereToGo,
  refreshOnboardingStage,
} from "@/lib/onboarding";

type FormState = {
  hmpiyt: string;
  hmcdh: string;
  sellonline: boolean | null;
};

const CONTACTS_UNBOUNDED_VALUE = "5001";

function getDisplayValue(range: string, storedValue: string) {
  if (!storedValue) return "";
  
  // Handle the 51+ case
  if (storedValue === "51") return "51+";
  
  // For ranges like 0-1, 2-10, 11-50
  if (range.includes("-")) {
    const parts = range.split("-");
    if (parts[1] === storedValue) return range;
  }
  
  // Try to find matching range based on stored max value
  const ranges = {
    "0-1": "1",
    "2-10": "10",
    "11-50": "50",
    "51+": "51",
    "1-300": "300",
    "301-1000": "1000",
    "1001-5000": "5000",
    "5000+": CONTACTS_UNBOUNDED_VALUE,
  };
  
  for (const [key, value] of Object.entries(ranges)) {
    if (value === storedValue) return key;
  }
  
  return "";
}

function getMaxValue(range: string) {
  if (!range) return "";
  if (range === "51+") return "51";
  if (range === "5000+") return CONTACTS_UNBOUNDED_VALUE;
  if (range.includes("-")) {
    const parts = range.split("-");
    return parts[1] || "";
  }
  return "";
}

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

export default function OtherInfoPage() {
  const [form, setForm] = useState<FormState>({
    hmpiyt: "",
    hmcdh: "",
    sellonline: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setPendingRedirect(redirect);
    }
  }, []);

  const payload = useMemo(() => {
    return {
      hmpiyt: Number(form.hmpiyt),
      hmcdh: Number(form.hmcdh),
      sellonline: form.sellonline,
    };
  }, [form]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.hmpiyt) e.hmpiyt = "Team size is required";
    if (!form.hmcdh) e.hmcdh = "Contacts size is required";
    if (form.sellonline === null) e.sellonline = "Please select yes or no";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError("");

    if (!validate()) return;

    try {
      setLoading(true);
      const authToken = getToken();

      if (!authToken) {
        throw new Error("Session expired. Please login again.");
      }

      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Something went wrong");
      }
      
      showToast("success", data?.message || "Saved successfully!");

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
      setApiError(err instanceof Error ? err.message : "Failed to save");
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

  const handelback = () => {
    const pendingRedirect = getPendingRedirect();

     if (pendingRedirect) {
          window.location.href = `/signup/step-4?redirect=${encodeURIComponent(pendingRedirect)}`;
        } else {
          window.location.href = "/signup/step-4";
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
                  Business Information
                </h1>
                <p className="text-sm text-white/90">
                  Step 5 of 7: Tell us about your business
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">A few more details</h2>
              <p className="mt-1 text-sm text-gray-500">
                This helps us personalize your SMTPMaster setup.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  How many people are in your team? <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={getDisplayValue("", form.hmpiyt)}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      const max = getMaxValue(selectedValue);
                      setForm((p) => ({ ...p, hmpiyt: max }));
                      setErrors((p) => ({ ...p, hmpiyt: "" }));
                    }}
                    className={`h-11 w-full rounded-xl border bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 ${
                      errors.hmpiyt ? "border-red-500" : "border-gray-200"
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select team size</option>
                    <option value="0-1">0–1 employee</option>
                    <option value="2-10">2–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51+">51+ employees</option>
                  </select>
                </div>
                {errors.hmpiyt && <p className="mt-1 text-xs text-red-500">{errors.hmpiyt}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  How many contacts do you have? <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Contact className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={getDisplayValue("", form.hmcdh)}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      const max = getMaxValue(selectedValue);
                      setForm((p) => ({ ...p, hmcdh: max }));
                      setErrors((p) => ({ ...p, hmcdh: "" }));
                    }}
                    className={`h-11 w-full rounded-xl border bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 ${
                      errors.hmcdh ? "border-red-500" : "border-gray-200"
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select contact range</option>
                    <option value="1-300">1–300 contacts</option>
                    <option value="301-1000">301–1000 contacts</option>
                    <option value="1001-5000">1001–5000 contacts</option>
                    <option value="5000+">5000+ contacts</option>
                  </select>
                </div>
                {errors.hmcdh && <p className="mt-1 text-xs text-red-500">{errors.hmcdh}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Do you sell online? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, sellonline: true }));
                      setErrors((p) => ({ ...p, sellonline: "" }));
                    }}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                      form.sellonline === true
                        ? "border-[#ff7800] bg-[#fff4ec] text-[#ff7800]"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                    disabled={loading}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Yes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, sellonline: false }));
                      setErrors((p) => ({ ...p, sellonline: "" })); 
                    }}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                      form.sellonline === false
                        ? "border-[#ff7800] bg-[#fff4ec] text-[#ff7800]"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                    disabled={loading}
                  >
                    No
                  </button>
                </div>
                {errors.sellonline && <p className="mt-1 text-xs text-red-500">{errors.sellonline}</p>}
              </div>

              {apiError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handelback}
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Saving..." : "Update & Continue"}
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
