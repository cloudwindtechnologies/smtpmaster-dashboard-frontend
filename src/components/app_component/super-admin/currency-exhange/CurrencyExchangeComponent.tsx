"use client";

import React, { useState } from "react";
import { token } from "../../common/http";
import { useRouter } from "next/navigation";

export default function CurrencyExchangeComponent() {
  const [usdRate, setUsdRate] = useState<number>(87);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
   const router=useRouter()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        "/api/currency-exchange",
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json", // ✅ REQUIRED
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            type: "inr",          // ✅ matches backend
            value: Number(usdRate), // ✅ force integer
          }),
        }
      );

      const data = await res.json();
         if (res.status === 401) {
        router.replace("/login"); 
        return;
      }

      if (!res.ok) {
        throw new Error(data?.errors?.value?.[0] || data?.error || "Failed");
      }

      setSuccess("Currency updated successfully");
      console.log("currency exchanged", data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-6">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 sm:px-6 py-3">
            <h2 className="text-base font-semibold text-gray-800">
              Edit currency
            </h2>
          </div>

          <form
            id="currencyForm"
            onSubmit={onSubmit}
            className="px-4 sm:px-6 py-6 space-y-3"
          >
            <label className="block text-sm font-semibold text-gray-800">
              1 USD =
            </label>

            <input
              type="number"
              min={1}
              value={usdRate}
              onChange={(e) => setUsdRate(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            {success && (
              <p className="text-sm text-green-600 font-medium">{success}</p>
            )}
          </form>
        </div>

        <div className="mt-5">
          <button
            type="submit"
            form="currencyForm"
            disabled={loading}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
