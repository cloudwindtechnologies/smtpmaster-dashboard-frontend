"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Mailbox, Building2, Loader2, Globe } from "lucide-react";

type Country = { id?: number | string; code?: string; name: string };

type AddressPayload = {
  address: string;
  zipcode: string;
  city: string;
  country: string; // store name (as you already do)
};

export default function AddressStepPage() {
  const router = useRouter();

  const [form, setForm] = useState<AddressPayload>({
    address: "",
    zipcode: "",
    city: "",
    country: "",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [saving, setSaving] = useState(false);

  const [apiError, setApiError] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setField = (k: keyof AddressPayload, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: "" } : p));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.zipcode.trim()) e.zipcode = "Zipcode is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.country.trim()) e.country = "Country is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ✅ API 1: Fetch countries (from Next backend)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingCountries(true);
        setApiError("");
        setMessage(null);

        const res = await fetch("/api/auth/register/countries", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Failed to load countries");

        // supports: {data:[]}, {countries:[]}, []
        const list: Country[] = json?.data || json?.countries || json || [];
        if (!cancelled) setCountries(Array.isArray(list) ? list : []);
      } catch (err: any) {
        if (!cancelled) setApiError(err?.message || "Failed to load countries");
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ API 2: Save address (from Next backend)
  const handleSaveContinue = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setApiError("");
      setMessage(null);

      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // backend validation errors support
        if (json?.errors && typeof json.errors === "object") {
          const serverErrors: Record<string, string> = {};
          Object.keys(json.errors).forEach((k) => {
            serverErrors[k] = Array.isArray(json.errors[k]) ? json.errors[k][0] : String(json.errors[k]);
          });
          setErrors((prev) => ({ ...prev, ...serverErrors }));
        }
        throw new Error(json?.message || "Failed to save address");
      }

      setMessage({ type: "success", text: json?.message || "Address saved successfully!" });
      router.replace("/signup/step-5");
    } catch (err: any) {
      setApiError(err?.message || "Failed to save address");
      setMessage({ type: "error", text: err?.message || "Failed to save address" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    router.replace("/signup/step-3");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Add your address</h1>
          <p className="mt-2 text-sm text-gray-500">
            This helps us configure your account properly.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Street, area, etc."
                className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? "border-red-500" : "border-gray-300"
                }`}
                disabled={saving}
              />
            </div>
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
          </div>

          {/* Zipcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zipcode <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mailbox className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={form.zipcode}
                onChange={(e) => setField("zipcode", e.target.value)}
                placeholder="Zip / Postal code"
                className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.zipcode ? "border-red-500" : "border-gray-300"
                }`}
                disabled={saving}
              />
            </div>
            {errors.zipcode && <p className="mt-1 text-xs text-red-600">{errors.zipcode}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="City"
                className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.city ? "border-red-500" : "border-gray-300"
                }`}
                disabled={saving}
              />
            </div>
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.country ? "border-red-500" : "border-gray-300"
                }`}
                disabled={saving || loadingCountries}
              >
                <option value="">
                  {loadingCountries ? "Loading countries..." : "Select country"}
                </option>
                {countries.map((c, i) => (
                  <option key={String(c.id ?? i)} value={String(c.name)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country}</p>}
          </div>

          {/* Messages */}
          {apiError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {apiError}
            </div>
          )}

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

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleSaveContinue}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Updating..." : "Update & Continue"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}
