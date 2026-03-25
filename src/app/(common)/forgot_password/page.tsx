"use client";

import React, { useState } from "react";
import { Mail, KeyRound, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function sendOTP() {
    setLoading(true);
    setMsg("");
    setIsSuccess(false);

    if (!email.trim()) {
      setMsg("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`api/auth/forgot-password/forgotPasswordSendOtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep(2);
        setIsSuccess(true);
        setMsg(data.message || "OTP sent to your email.");
      } else {
        setIsSuccess(false);
        setMsg(data.message || "Failed to send OTP.");
      }
    } catch (error) {
      console.error("sendOTP error:", error);
      setIsSuccess(false);
      setMsg("Something went wrong while sending OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP() {
    setLoading(true);
    setMsg("");
    setIsSuccess(false);

    if (!otp.trim()) {
      setMsg("Please enter the OTP.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`api/auth/forgot-password/forgotPasswordVerifyOtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep(3);
        setIsSuccess(true);
        setMsg(data.message || "OTP verified successfully.");
      } else {
        setIsSuccess(false);
        setMsg(data.message || "Invalid OTP.");
      }
    } catch (error) {
      console.error("verifyOTP error:", error);
      setIsSuccess(false);
      setMsg("Something went wrong while verifying OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setLoading(true);
    setMsg("");
    setIsSuccess(false);

    if (!password.trim() || !confirm.trim()) {
      setMsg("Please fill in both password fields.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMsg("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setMsg("Confirm password does not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`api/auth/forgot-password/forgotPasswordReset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          new_password: password,
          confirm_password: confirm,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setIsSuccess(true);
        setMsg(data.message || "Password reset successfully. You can now login.");
      } else {
        setIsSuccess(false);
        setMsg(data.message || "Reset failed.");
      }
    } catch (error) {
      console.error("resetPassword error:", error);
      setIsSuccess(false);
      setMsg("Something went wrong while resetting password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <img
            src="/LoginLogo.png"
            alt="SMTPMaster"
            className="mx-auto max-h-[60px]"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500">
            Reset your SMTPMaster account password
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">
              Email Address
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7800]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={sendOTP}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff7800] py-2.5 text-white font-semibold hover:bg-[#e66c00] disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send OTP
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">
              Enter OTP
            </label>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Enter OTP"
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7800]"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={verifyOTP}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff7800] py-2.5 text-white font-semibold hover:bg-[#e66c00] disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify OTP
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setMsg("");
                setIsSuccess(false);
              }}
              className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Change Email
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">
              New Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="password"
                placeholder="New password"
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7800]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <label className="text-sm font-medium text-gray-700">
              Confirm Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7800]"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={resetPassword}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff7800] py-2.5 text-white font-semibold hover:bg-[#e66c00] disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </button>

            {isSuccess && (
              <Link
                href="/login"
                className="block w-full rounded-xl border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go to Login
              </Link>
            )}
          </div>
        )}

        {msg && (
          <div
            className={`mt-5 rounded-xl px-4 py-3 text-sm ${
              isSuccess
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-600"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400">
          © SMTPMaster. All rights reserved.
        </div>
      </div>
    </div>
  );
}