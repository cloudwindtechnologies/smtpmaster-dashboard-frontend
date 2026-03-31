"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Contact, ShoppingCart, Loader2 } from "lucide-react";

type FormState = {
  hmpiyt: string; // stored as string in UI
  hmcdh: string;  // stored as string in UI
  sellonline: boolean | null;
};

function getMaxValue(range: string) {
  if (!range) return "";
  if (range.includes("+")) return range.replace("+", "");
  const parts = range.split("-");
  return parts[1] || "";
}

export default function OtherInfoPage() {
  const router = useRouter();

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

  const [form, setForm] = useState<FormState>({
    hmpiyt: "",
    hmcdh: "",
    sellonline: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
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
    setSuccessMsg("");

    if (!validate()) return;

    try {
      setLoading(true);

      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Something went wrong");
      }

      setSuccessMsg(data?.message || "Saved successfully!");
      const pendingRedirect = getPendingRedirect();

      if (pendingRedirect) {
        localStorage.setItem("wheretogo", "statp7");
        document.cookie = "wheretogo=statp7; Path=/; Max-Age=604800; SameSite=Lax";
        router.replace(`/signup/step-7?redirect=${encodeURIComponent(pendingRedirect)}`);
      } else {
        localStorage.setItem("wheretogo", "statp7");
        document.cookie = "wheretogo=statp7; Path=/; Max-Age=604800; SameSite=Lax";
        router.replace("/signup/step-7");
      }
    } catch (err: any) {
      setApiError(err?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };
  const handelback=() => {
  const pendingRedirect = getPendingRedirect();

  if (pendingRedirect) {
    localStorage.setItem("wheretogo", "stat4");
    document.cookie = "wheretogo=statp4; Path=/; Max-Age=604800; SameSite=Lax";
    router.replace(`/signup/step-4?redirect=${encodeURIComponent(pendingRedirect)}`);
  } else {
    localStorage.setItem("wheretogo", "stat4");
    document.cookie = "wheretogo=statp4; Path=/; Max-Age=604800; SameSite=Lax";
    router.replace("/signup/step-4");
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">A few more details</h1>
          <p className="mt-2 text-sm text-gray-500">
            This helps us personalize your SMTPMaster setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many people are in your team? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={form.hmpiyt ? `0-${form.hmpiyt}` : ""}
                onChange={(e) => {
                  const max = getMaxValue(e.target.value);
                  setForm((p) => ({ ...p, hmpiyt: max }));
                  setErrors((p) => ({ ...p, hmpiyt: "" }));
                }}
                className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.hmpiyt ? "border-red-500" : "border-gray-300"
                }`}
                disabled={loading}
              >
                <option value="">Select</option>
                <option value="0-1">0–1 employee</option>
                <option value="2-10">2–10 employees</option>
                <option value="11-50">11–50 employees</option>
                <option value="51+">51+ employees</option>
              </select>
            </div>
            {errors.hmpiyt && <p className="mt-1 text-xs text-red-600">{errors.hmpiyt}</p>}
          </div>

          {/* Contacts size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many contacts do you have? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Contact className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={form.hmcdh ? `0-${form.hmcdh}` : ""}
                onChange={(e) => {
                  const max = getMaxValue(e.target.value);
                  setForm((p) => ({ ...p, hmcdh: max }));
                  setErrors((p) => ({ ...p, hmcdh: "" }));
                }}
                className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.hmcdh ? "border-red-500" : "border-gray-300"
                }`}
                disabled={loading}
              >
                <option value="">Select</option>
                <option value="1-300">1–300</option>
                <option value="301-1000">301–1000</option>
                <option value="1001-5000">1001–5000</option>
                <option value="5000+">5000+</option>
              </select>
            </div>
            {errors.hmcdh && <p className="mt-1 text-xs text-red-600">{errors.hmcdh}</p>}
          </div>

          {/* Sell online */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you sell online? <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, sellonline: true }));
                  setErrors((p) => ({ ...p, sellonline: "" }));
                }}
                className={[
                  "rounded-lg border px-4 py-2.5 text-sm font-semibold transition inline-flex items-center justify-center gap-2",
                  form.sellonline === true
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
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
                className={[
                  "rounded-lg border px-4 py-2.5 text-sm font-semibold transition inline-flex items-center justify-center gap-2",
                  form.sellonline === false
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                disabled={loading}
              >
                No
              </button>
            </div>

            {errors.sellonline && <p className="mt-1 text-xs text-red-600">{errors.sellonline}</p>}
          </div>

          {/* API messages */}
          {apiError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {apiError}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => handelback}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Previous
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Saving..." : "Update & Continue"}
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
