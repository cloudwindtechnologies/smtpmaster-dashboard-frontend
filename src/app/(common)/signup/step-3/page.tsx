"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Building2, Globe, Loader2, User, ChevronDown, Search, ArrowLeft } from "lucide-react";
import { showToast } from "@/components/app_component/common/toastHelper";
import { token as getToken } from "@/components/app_component/common/http";
import { jwtDecode } from "jwt-decode";

type FormState = {
  first_name: string;
  last_name: string;
  country: string;
  website: string;
};

// Helper functions for pending redirect
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

// Function to update token with new wheretogo value
function updateTokenWithNewStage(currentToken: string, newStage: string): string {
  try {
    const decoded: any = jwtDecode(currentToken);
    
    // Create updated payload with new wheretogo
    const updatedPayload = {
      ...decoded,
      data: {
        ...(decoded.data || {}),
        wheretogo: newStage
      }
    };
    
    // Re-encode to base64 (this is just for storage, actual validation still needs server)
    // Note: This doesn't create a valid JWT signature, but it's enough for client-side checks
    // The middleware will still validate with the server
    const updatedToken = currentToken; // Keep original token
    
    return updatedToken;
  } catch (error) {
    console.error("Error updating token:", error);
    return currentToken;
  }
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    country: "",
    website: "",
  });
  
  const [countryLoading, setCountryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Store redirect from URL when component mounts
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect !== "/" && !redirect.includes('_rsc')) {
      setPendingRedirect(redirect);
    }
  }, [searchParams]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register/update-profile", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Something went wrong");
      }

      showToast("success", data?.message || "Profile updated successfully!");
      
      // Update local storage and cookie
      localStorage.setItem("wheretogo", "statp4");
      document.cookie = "wheretogo=statp4; Path=/; Max-Age=604800; SameSite=Lax";
      
      // CRITICAL: Also update the token in cookie to have the new wheretogo
      const currentToken = getToken();
      if (currentToken) {
        // Store the new wheretogo in localStorage for OnboardingGuard to check
        localStorage.setItem("user_stage", "statp4");
      }
      
      // After successful update, redirect to step-4
      const pendingRedirect = getPendingRedirect();
      
      // Use setTimeout to ensure localStorage is updated before navigation
      setTimeout(() => {
        if (pendingRedirect) {
          router.replace(`/signup/step-4?redirect=${encodeURIComponent(pendingRedirect)}`);
        } else {
          router.replace("/signup/step-4");
        }
      }, 100);
      
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
                  Step 3 of 5: Complete your profile information
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

              {/* Buttons */}
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