"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

type CountryItem = {
  id?: number | string;
  name?: string;
  country_name?: string;
  code?: string;
  iso_code?: string;
  dial_code?: string;
  phonecode?: string | number;
};

export default function PhoneVerifyPage() {
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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setPendingRedirect(redirect);
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
           console.log(countryList);
        setCountries(countryList);

        if (countryList.length > 0) {
          const india =
            countryList.find(
              (item: CountryItem) =>
                item.code === "IN" ||
                item.iso_code === "IN" ||
                item.name?.toLowerCase() === "india" ||
                item.country_name?.toLowerCase() === "india"
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
    if (item.code) {
      return String(item.code).startsWith("+")
        ? String(item.code)
        : `+${item.code}`;
    }

    if (item.phonecode !== undefined && item.phonecode !== null) {
      const phonecode = String(item.phonecode);
      return phonecode.startsWith("+") ? phonecode : `+${phonecode}`;
    }

    return "";
  }

  function getCountryLabel(item: CountryItem) {
    return (
      item.country_name ||
      item.name ||
      item.code ||
      item.iso_code ||
      "Country"
    );
  }

  const handleSendOTP = async () => {
    setMessage("");

    if (!digitsOnly(mobile) || digitsOnly(mobile).length < 6) {
      setMessage("Please enter a valid phone number");
      return;
    }

    try {
      setLoading(true);

      const recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );

      const result = await signInWithPhoneNumber(
        auth,
        fullNumber,
        recaptchaVerifier
      );

      setConfirmationResult(result);
      setStep("otp");
      setMessage("✅ OTP sent successfully");
    } catch (error: any) {
      console.error("Send OTP error:", error);
      setMessage(`❌ ${error.message || "Failed to send OTP"}`);
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

    if (!otp) {
      setMessage("Please enter OTP");
      return;
    }

    try {
      setLoading(true);

      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken();

      const appAuthToken = localStorage.getItem("token");

      const response = await fetch("/api/auth/register/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${appAuthToken || ""}`,
        },
        body: JSON.stringify({
          country_code: countryCode,
          mobile: digitsOnly(mobile),
          full_number: fullNumber,
          firebase_token: firebaseToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      setMessage("✅ Phone verified successfully!");

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      setTimeout(() => {
        const pendingRedirect = getPendingRedirect();

        // ✅ very important: mark signup complete BEFORE redirect
        localStorage.setItem("wheretogo", "dashboard");
        document.cookie = "wheretogo=dashboard; Path=/; Max-Age=604800; SameSite=Lax";

        if (data.token) {
          localStorage.setItem("token", data.token);
          document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=604800; SameSite=Lax`;
        }

        clearPendingRedirect();

        if (pendingRedirect) {
          window.location.href = pendingRedirect;
          return;
        }

        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      console.error("Verify error:", error);
      setMessage(`❌ ${error.message || "Invalid OTP"}`);
    } finally {
      setLoading(false);
    }
  };

  const useTestNumber = (code: string, number: string) => {
    setCountryCode(code);
    setMobile(number);
    setMessage("✅ Test number selected");
  };

  return (
    <div
      style={{
        maxWidth: 450,
        margin: "40px auto",
        padding: 30,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "white",
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, color: "#333", marginBottom: 8 }}>
          Phone Verification
        </h1>
        <p style={{ color: "#666", fontSize: 14 }}>
          {step === "phone"
            ? "Enter your phone number"
            : "Enter verification code"}
        </p>
      </div>

      {step === "phone" ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              Phone Number
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{
                  width: "130px",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 16,
                }}
                disabled={loading || countryLoading}
              >
                {countries.length > 0 ? (
                  countries.map((item, index) => {
                    const dialCode = getDialCode(item);
                    if (!dialCode) return null;

                    return (
                      <option key={item.id ?? index} value={dialCode}>
                        {dialCode} ({getCountryLabel(item)})
                      </option>
                    );
                  })
                ) : (
                  <option value="+91">+91 (India)</option>
                )}
              </select>

              <input
                type="tel"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 16,
                }}
                disabled={loading}
                maxLength={15}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              Quick Test Numbers
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => useTestNumber("+1", "6505553434")}
                type="button"
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  backgroundColor: "#e9ecef",
                  border: "1px solid #dee2e6",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                US: +1 6505553434
              </button>

              <button
                onClick={() => useTestNumber("+44", "1234567890")}
                type="button"
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  backgroundColor: "#e9ecef",
                  border: "1px solid #dee2e6",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                UK: +44 1234567890
              </button>

              <button
                onClick={() => useTestNumber("+91", "9876543210")}
                type="button"
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  backgroundColor: "#e9ecef",
                  border: "1px solid #dee2e6",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                India: +91 9876543210
              </button>
            </div>
          </div>

          <button
            onClick={handleSendOTP}
            disabled={loading || countryLoading || !digitsOnly(mobile)}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>

          <div id="recaptcha-container"></div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              Verification Code
            </label>

            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 18,
                textAlign: "center",
                letterSpacing: 4,
              }}
              disabled={loading}
              maxLength={6}
              autoFocus
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
                setMessage("");
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || !otp}
              style={{
                flex: 2,
                padding: "12px",
                backgroundColor: loading ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </div>
        </>
      )}

      {message && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
            color: message.includes("✅") ? "#155724" : "#721c24",
            borderRadius: 6,
            border: `1px solid ${
              message.includes("✅") ? "#c3e6cb" : "#f5c6cb"
            }`,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}