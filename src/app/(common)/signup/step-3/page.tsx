"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, Globe, Loader2, User, ChevronDown, Search, ArrowLeft } from "lucide-react";
import { showToast } from "@/components/app_component/common/toastHelper";

type FormState = {
  first_name: string;
  last_name: string;
  country: string;
  website: string;
};

type CountryItem = {
  code?: string;
  iso_code?: string;
  name?: string;
  country_name?: string;
  phone_code?: string;
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    country: "",
    website: "",
  });
  
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setCountryLoading(true);

        const response = await fetch("/api/auth/register/countries", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();
        
        const countryList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.countries)
          ? data.countries
          : Array.isArray(data)
          ? data
          : [];
        
        setCountries(countryList);
      } catch (error) {
        console.error("Country fetch error:", error);
        showToast("error", "❌ Failed to load countries");
      } finally {
        setCountryLoading(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setPendingRedirect(redirect);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCountrySelect = (country: CountryItem) => {
    const countryName = country.name || country.country_name || "";
    setForm((prev) => ({ ...prev, country: countryName }));
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const filteredCountries = countries.filter((country) => {
    const countryName = (country.name || country.country_name || "").toLowerCase();
    const countryCode = (country.code || country.iso_code || "").toLowerCase();
    return countryName.includes(searchTerm.toLowerCase()) || countryCode.includes(searchTerm.toLowerCase());
  });

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



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Something went wrong");
      }

      showToast("success", data?.message || "Profile updated successfully!");
      const pendingRedirect = getPendingRedirect();

      if (pendingRedirect) {
        localStorage.setItem("wheretogo", "statp4");
        document.cookie = "wheretogo=statp4; Path=/; Max-Age=604800; SameSite=Lax";
        router.replace(`/signup/step-4?redirect=${encodeURIComponent(pendingRedirect)}`);
      } else {
        localStorage.setItem("wheretogo", "statp4");
        document.cookie = "wheretogo=statp4; Path=/; Max-Age=604800; SameSite=Lax";
        router.replace("/signup/step-4");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
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
                  Profile Setup
                </h1>
                <p className="text-sm text-white/90">
                  Step 4 of 5: Complete your profile information
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* First Name */}
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

              {/* Last Name */}
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

              {/* Country Dropdown */}
              <div ref={dropdownRef} className="relative">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-left focus:outline-none focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 transition hover:border-gray-300"
                    disabled={countryLoading}
                  >
                    {countryLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-gray-500">Loading countries...</span>
                      </div>
                    ) : (
                      <span className={form.country ? "text-gray-900" : "text-gray-400"}>
                        {form.country || "Select your country"}
                      </span>
                    )}
                  </button>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && !countryLoading && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff7800] focus:ring-2 focus:ring-[#ff7800]/10"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country, index) => {
                          const countryName = country.name || country.country_name || "";
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-0"
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

              {/* Website */}
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

              {/* Buttons - Side by Side */}
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
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}