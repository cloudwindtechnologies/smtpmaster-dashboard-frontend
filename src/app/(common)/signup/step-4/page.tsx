"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  MapPin,
  Mailbox,
  Building2,
  Loader2,
  Globe,
  ChevronDown,
  Search,
  ArrowLeft,
} from "lucide-react";
import { showToast } from "@/components/app_component/common/toastHelper";
import { token as getToken } from "@/components/app_component/common/http";

type Country = {
  id?: number | string;
  code?: string;
  name: string;
  iso_code?: string;
  country_name?: string;
};

type AddressPayload = {
  address: string;
  zipcode: string;
  city: string;
  country: string;
};

// redirect helpers
function setPendingRedirect(path: string | null) {
  if (typeof window === "undefined") return;
  if (!path) return;
  if (!path.startsWith("/") || path.includes("://")) return;
  if (path.startsWith("/login") || path.startsWith("/signup")) return;
  sessionStorage.setItem("pending_redirect", path);
}

function getPendingRedirect() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("pending_redirect");
}

// ✅ WRAPPER (IMPORTANT FIX)
export default function AddressStepPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f6fb]" />}>
      <AddressStepInner />
    </Suspense>
  );
}

// ✅ YOUR ORIGINAL CODE MOVED HERE
function AddressStepInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<AddressPayload>({
    address: "",
    zipcode: "",
    city: "",
    country: "",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ redirect fix
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect !== "/" && !redirect.includes("_rsc")) {
      setPendingRedirect(redirect);
    }
  }, [searchParams]);

  // fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setCountryLoading(true);
        const res = await fetch("/api/auth/register/countries", {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json();

        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.countries)
          ? data.countries
          : Array.isArray(data)
          ? data
          : [];

        setCountries(list);
      } catch {
        showToast("error", "❌ Failed to load countries");
      } finally {
        setCountryLoading(false);
      }
    };

    fetchCountries();
  }, []);

  // outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const setField = (k: keyof AddressPayload, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
  };

  const handleCountrySelect = (c: Country) => {
    const name = c.name || c.country_name || "";
    setForm((p) => ({ ...p, country: name }));
    setIsDropdownOpen(false);
  };

  const filteredCountries = countries.filter((c) => {
    const name = (c.name || c.country_name || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const validate = () => {
    if (!form.address.trim()) return showToast("error", "Address required"), false;
    if (!form.zipcode.trim()) return showToast("error", "Zipcode required"), false;
    if (!form.city.trim()) return showToast("error", "City required"), false;
    if (!form.country.trim()) return showToast("error", "Country required"), false;
    return true;
  };

  const handleSaveContinue = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message);

      showToast("success", "Address saved!");

      localStorage.setItem("wheretogo", "statp5");
      document.cookie = "wheretogo=statp5; Path=/; Max-Age=604800";

      const pending = getPendingRedirect();

      setTimeout(() => {
        router.replace(
          pending
            ? `/signup/step-5?redirect=${encodeURIComponent(pending)}`
            : "/signup/step-5"
        );
      }, 100);
    } catch (e: any) {
      showToast("error", e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    const pending = getPendingRedirect();

    localStorage.setItem("wheretogo", "statp3");
    document.cookie = "wheretogo=statp3; Path=/; Max-Age=604800";

    router.replace(
      pending
        ? `/signup/step-3?redirect=${encodeURIComponent(pending)}`
        : "/signup/step-3"
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 pb-32 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <div className="overflow-visible rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          {/* Header with Logo */}
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
                  Address Setup
                </h1>
                <p className="text-sm text-white/90">
                  Step 4 of 5: Add your business address
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-visible p-5 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveContinue();
              }}
              className="space-y-5"
            >
              {/* Address */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Street, area, etc."
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                  />
                </div>
              </div>

              {/* Zipcode */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Zipcode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mailbox className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Zip / Postal code"
                    value={form.zipcode}
                    onChange={(e) => setField("zipcode", e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10"
                  />
                </div>
              </div>

              {/* Country Dropdown */}
              <div ref={dropdownRef} className="relative z-[100]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-left text-sm transition hover:border-gray-300 focus:border-[#ff7800] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#ff7800]/10"
                    disabled={countryLoading}
                  >
                    {countryLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-gray-500">Loading countries...</span>
                      </div>
                    ) : (
                      <span
                        className={
                          form.country ? "text-gray-900" : "text-gray-400"
                        }
                      >
                        {form.country || "Select your country"}
                      </span>
                    )}
                  </button>

                  <ChevronDown
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && !countryLoading && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                    <div className="border-b border-gray-200 bg-gray-50 p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-[#ff7800] focus:outline-none focus:ring-2 focus:ring-[#ff7800]/10"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country, index) => {
                          const countryName =
                            country.name || country.country_name || "";
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className="w-full border-b border-gray-100 px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 last:border-0"
                            >
                              <span className="text-gray-700">{countryName}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          No countries found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
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
                  {loading ? "Updating..." : "Update & Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}