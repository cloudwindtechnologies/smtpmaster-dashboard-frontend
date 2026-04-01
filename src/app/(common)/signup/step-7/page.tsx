"use client";

import React, { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import Image from "next/image";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

type CountryItem = {
  id?: number | string;
  code?: string;
  name?: string;
};

function sanitizeInternalRedirect(path: string | null): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (trimmed === "/login" || trimmed.startsWith("/login?")) return null;
  if (trimmed === "/signup" || trimmed.startsWith("/signup")) return null;
  if (trimmed === "/unauthorized" || trimmed.startsWith("/unauthorized")) return null;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return null;

  return trimmed;
}

function setCookie(name: string, value: string, maxAge = 60 * 60 * 24 * 7) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const row = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  if (!row) return null;

  try {
    return decodeURIComponent(row.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export default function PhoneVerifyPage() {
  const [countryCode, setCountryCode] = useState("+91");
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryLoading, setCountryLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCountries = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return countries.filter((item) => {
      const dialCode = getDialCode(item).toLowerCase();
      const label = getCountryLabel(item).toLowerCase();
      return dialCode.includes(q) || label.includes(q);
    });
  }, [countries, searchTerm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = sanitizeInternalRedirect(params.get("redirect"));

    if (redirect) {
      setCookie("pending_redirect", redirect, 60 * 30);
    }
  }, []);

  const fullNumber = `${countryCode}${digitsOnly(mobile)}`;

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

        if (countryList.length > 0) {
          const india =countryList.find(
                      (item: CountryItem) =>
                      item.name?.toLowerCase() === "india" || item.code === "+91"
                      ) || countryList[0];

          const dialCode = getDialCode(india);
          if (dialCode) {
            setCountryCode(dialCode);
          }
        }
      } catch (error) {
        console.error("Country fetch error:", error);
        setMessage("❌ Failed to load countries");
      } finally {
        setCountryLoading(false);
      }
    };

    fetchCountries();
  }, []);

 function getDialCode(item: CountryItem) {
  const raw = String(item.code || "").replace(/\s+/g, "").trim();
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function getCountryLabel(item: CountryItem) {
  return item.name || "Country";
}

  const handleSendOTP = async () => {
    setMessage("");

    if (!digitsOnly(mobile) || digitsOnly(mobile).length < 6) {
      setMessage("Please enter a valid phone number");
      return;
    }

    try {
      setLoading(true);

      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });

      const result = await signInWithPhoneNumber(auth, fullNumber, verifier);

      setConfirmationResult(result);
      setStep("otp");
      setMessage("✅ OTP sent successfully");
    } catch (error: any) {
      console.error("Send OTP error:", error);
      setMessage(`❌ ${error?.message || "Failed to send OTP"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setMessage("");

    if (!confirmationResult) {
      setMessage("Please request OTP first");
      return;
    }

    if (!otp || otp.length < 6) {
      setMessage("Please enter a valid OTP");
      return;
    }

    try {
      setLoading(true);

      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken();

      const appAuthToken =
        localStorage.getItem("token") || getCookie("token") || "";

      const response = await fetch("/api/auth/register/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${appAuthToken}`,
        },
        body: JSON.stringify({
          country_code: countryCode,
          mobile: digitsOnly(mobile),
          full_number: fullNumber,
          firebase_token: firebaseToken,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Verification failed");
      }

      setMessage("✅ Phone verified successfully!");

      if (data?.token) {
        localStorage.setItem("token", data.token);
        setCookie("token", data.token);
      }

      const finalRole =
        data?.role === "superadmin" || data?.role === "user"
          ? data.role
          : "user";

      localStorage.setItem("role", finalRole);
      setCookie("role", finalRole);

      localStorage.removeItem("wheretogo");
      deleteCookie("wheretogo");

      const pendingRedirect = sanitizeInternalRedirect(getCookie("pending_redirect"));
      deleteCookie("pending_redirect");

      setTimeout(() => {
        if (pendingRedirect) {
          window.location.href = pendingRedirect;
        } else {
          window.location.href = "/";
        }
      }, 1200);
    } catch (error: any) {
      console.error("Verify error:", error);
      setMessage(`❌ ${error?.message || "Invalid OTP"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <div className="overflow-visible rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
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
                  Phone Verification
                </h1>
                <p className="text-sm text-white/90">
                  Step 5 of 5: Verify your mobile number
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-visible p-5 sm:p-6">
            <div className="mb-6 text-center">
              <h2 className="text-[24px] font-bold tracking-tight text-gray-900">
                {step === "phone" ? "Verify your phone number" : "Enter OTP code"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {step === "phone"
                  ? "Secure your account with mobile verification"
                  : "Enter the 6-digit code sent to your mobile number"}
              </p>
            </div>

            {step === "phone" ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>

                  <div className="flex gap-3">
                    <div className="relative w-[170px]">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        disabled={loading || countryLoading}
                        className="flex h-11 w-full items-center rounded-xl border border-gray-200 bg-gray-50 px-3 pr-10 text-left text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 disabled:opacity-60"
                      >
                        <span className="truncate">
                          {countryCode} (
                          {getCountryLabel(
                            countries.find((item) => getDialCode(item) === countryCode) || {}
                          )}
                          )
                        </span>
                      </button>

                      <svg
                        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>

                      {isDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                          <div className="border-b border-gray-200 bg-gray-50 p-3">
                            <input
                              type="text"
                              placeholder="Search country or code..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#ff7800] focus:ring-2 focus:ring-[#ff7800]/10"
                              autoFocus
                            />
                          </div>

                          <div className="max-h-64 overflow-y-auto">
                            {filteredCountries.map((item, index) => {
                              const dialCode = getDialCode(item);
                              const label = getCountryLabel(item);

                              if (!dialCode) return null;

                              return (
                                <button
                                  key={item.id ?? index}
                                  type="button"
                                  onClick={() => {
                                    setCountryCode(dialCode);
                                    setIsDropdownOpen(false);
                                    setSearchTerm("");
                                  }}
                                  className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-2.5 text-left text-sm transition hover:bg-orange-50 last:border-b-0"
                                >
                                  <span className="font-medium text-gray-900">
                                    {dialCode}
                                  </span>
                                  <span className="ml-3 truncate text-gray-600">
                                    {label}
                                  </span>
                                </button>
                              );
                            })}

                            {filteredCountries.length === 0 && (
                              <div className="px-4 py-6 text-center text-sm text-gray-500">
                                No countries found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      disabled={loading}
                      maxLength={15}
                      className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 disabled:opacity-60"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Please enter an active mobile number to receive your verification code.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading || countryLoading || !digitsOnly(mobile)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>

                <div id="recaptcha-container" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Verification sent to
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {fullNumber}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    OTP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    maxLength={6}
                    autoFocus
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-center text-lg tracking-[0.35em] text-gray-900 outline-none transition focus:border-[#ff7800] focus:bg-white focus:ring-4 focus:ring-[#ff7800]/10 disabled:opacity-60"
                  />
                </div>

                {!!message && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    {message}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setMessage("");
                    }}
                    disabled={loading}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6}
                    className="inline-flex h-11 flex-[1.4] items-center justify-center rounded-xl bg-[#ff7800] px-4 text-sm font-semibold text-white transition hover:bg-[#e66c00] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>
                </div>
              </div>
            )}

            {step === "phone" && !!message && (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}