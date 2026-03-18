"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import {
  ConfirmationResult,
  signInWithPhoneNumber,
  connectAuthEmulator,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { token } from "@/components/app_component/common/http";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

declare global {
  interface Window {
    __authEmulatorConnected?: boolean;
  }
}

export default function PhoneOtpVerifyPage() {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fetchingCode, setFetchingCode] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const isDev = process.env.NODE_ENV === "development";

  const fullNumber = useMemo(() => {
    const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    const num = digitsOnly(mobile);
    return num ? `${cc}${num}` : "";
  }, [countryCode, mobile]);

  const canSendOtp = useMemo(() => {
    return digitsOnly(mobile).length >= 8 && fullNumber.length > 0;
  }, [mobile, fullNumber]);

  const canVerify = useMemo(() => {
    return !!confirmationResult && digitsOnly(otp).length >= 4;
  }, [confirmationResult, otp]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isDev && !window.__authEmulatorConnected) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      window.__authEmulatorConnected = true;
    }
  }, [isDev]);

  const handleSendOtp = async () => {
    setMessage(null);

    if (!canSendOtp) {
      setMessage({ type: "error", text: "Enter a valid phone number" });
      return;
    }

    setSending(true);

    try {
      if (!isDev) {
        throw new Error(
          "This page is currently set up for development with Firebase Auth Emulator only."
        );
      }

      const result = await signInWithPhoneNumber(auth, fullNumber);
      setConfirmationResult(result);

      setMessage({
        type: "success",
        text: "OTP generated in Firebase Auth Emulator.",
      });
    } catch (e: any) {
      console.error("Firebase send OTP error:", e);
      setMessage({
        type: "error",
        text: e?.message || "Failed to send OTP",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFetchEmulatorCode = async () => {
    if (!isDev || !fullNumber) return;

    setFetchingCode(true);
    setMessage(null);

    try {
      const res = await fetch(
        "http://127.0.0.1:9099/emulator/v1/projects/demo-project/verificationCodes"
      );
      const data = await res.json();

      const match = Array.isArray(data?.verificationCodes)
        ? data.verificationCodes.find(
            (item: any) => item.phoneNumber === fullNumber
          )
        : null;

      if (!match?.code) {
        throw new Error("No emulator OTP found for this number.");
      }

      setOtp(match.code);
      setMessage({
        type: "success",
        text: `Fetched emulator OTP: ${match.code}`,
      });
    } catch (e: any) {
      console.error("Fetch emulator code error:", e);
      setMessage({
        type: "error",
        text: e?.message || "Failed to fetch emulator OTP.",
      });
    } finally {
      setFetchingCode(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!confirmationResult) {
      setMessage({ type: "error", text: "Please send OTP first." });
      return;
    }

    if (!canVerify) {
      setMessage({ type: "error", text: "Enter a valid OTP." });
      return;
    }

    setVerifying(true);

    try {
      await confirmationResult.confirm(digitsOnly(otp));

      const res = await fetch(
        "http://localhost:8000/api/v1/user/verifyMobileWithFirebase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            country_code: countryCode,
            mobile: digitsOnly(mobile),
            full_number: fullNumber,
            firebase_verified: true,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save verification status");
      }

      setMessage({
        type: "success",
        text: data?.message || "Phone verified successfully!",
      });

      router.replace("/login");
    } catch (e: any) {
      console.error("Firebase verify OTP error:", e);
      setMessage({
        type: "error",
        text: e?.message || "OTP verification failed",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify your phone</h1>
          <p className="mt-2 text-sm text-gray-500">
            Development mode: Firebase Auth Emulator
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91"
                disabled={sending || verifying}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone number
              </label>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="9876543210"
                inputMode="numeric"
                disabled={sending || verifying}
              />
            </div>
          </div>

          {fullNumber ? (
            <div className="text-xs text-gray-600">
              Sending to:{" "}
              <span className="font-semibold text-gray-900">{fullNumber}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sending || verifying || !canSendOtp}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? "Sending OTP..." : "Send OTP"}
          </button>

          {confirmationResult && (
            <button
              type="button"
              onClick={handleFetchEmulatorCode}
              disabled={fetchingCode}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
            >
              {fetchingCode && <Loader2 className="h-4 w-4 animate-spin" />}
              {fetchingCode ? "Fetching OTP..." : "Fetch Emulator OTP"}
            </button>
          )}
        </div>

        <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OTP
            </label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter OTP"
              inputMode="numeric"
              maxLength={8}
              disabled={sending || verifying}
            />
          </div>

          {message && (
            <div
              className={[
                "rounded-lg px-3 py-2 text-sm",
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600",
              ].join(" ")}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setConfirmationResult(null);
                setMessage(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              disabled={sending || verifying}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <button
              type="submit"
              disabled={sending || verifying || !canVerify}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {verifying ? "Verifying..." : "Verify & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}