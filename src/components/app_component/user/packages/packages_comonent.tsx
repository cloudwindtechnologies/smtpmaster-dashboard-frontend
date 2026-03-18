"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  Loader2,
  Package,
  Clock,
  Zap,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { token } from "../../common/http";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";

type PlanTab = "monthly" | "longterm";

/** ✅ Backend plan type (your API keys) */
type ApiPlan = {
  id: number;
  package_name: string;
  mail_limit: number | string;
  mail_per_hour: number | string;
  package_valid_days: string;
  price: string;
  status: string;
  hide_buy_btn?: string;
  featured_image?: string;
  dedicated_ip?: boolean;
  free_sending_app?: boolean;
  free_sending_domain?: boolean;
};

/** ✅ UI row type (what table uses) */
type PackageRow = {
  id: number;
  name: string;
  emailLimit: number;
  validity: string;
  speed: string;
  price: number;
  rawValidDays: number;
  hideBuyBtn: boolean;

  /** ✅ NEW: if price is 0 then disable buy */
  isFree: boolean;
};

type CrsResponse = {
  code: number;
  data?: { id: number; type: string; value: number | string };
  message?: string;
};

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapApiPlanToRow(p: ApiPlan): PackageRow {
  const days = toNumber(p.package_valid_days, 0);
  const price = toNumber(p.price, 0);

  return {
    id: p.id,
    name: p.package_name ?? "",
    emailLimit: toNumber(p.mail_limit, 0),
    validity: `${days} days`,
    speed: `${toNumber(p.mail_per_hour, 0)} /hr`,
    price,
    rawValidDays: days,
    hideBuyBtn: p.hide_buy_btn === "1",

    // ✅ if 0 or negative => treat as "free" (disable buy)
    isFree: price <= 0,
  };
}

/** ✅ status=1 only visible, status=0 hidden. Split by valid days > 30 */
function splitPlans(plans: ApiPlan[]) {
  const monthly: PackageRow[] = [];
  const longterm: PackageRow[] = [];

  for (const p of plans) {
    if (String(p.status) !== "1") continue;

    const row = mapApiPlanToRow(p);

    if (row.rawValidDays > 30) longterm.push(row);
    else monthly.push(row);
  }

  monthly.sort((a, b) => a.price - b.price);
  longterm.sort((a, b) => a.price - b.price);

  return { monthly, longterm };
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { __raw: text };
  }
}

export default function AllPakagesComponent() {
  const { user, loading: userLoading } = useUser();

  const [tab, setTab] = useState<PlanTab>("monthly");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [monthlyPackages, setMonthlyPackages] = useState<PackageRow[]>([]);
  const [longTermPackages, setLongTermPackages] = useState<PackageRow[]>([]);

  const [cartLoadingId, setCartLoadingId] = useState<number | null>(null);

  // ✅ CRS state (INR conversion value)
  const [inrRate, setInrRate] = useState<number | null>(null);
  const [crsLoading, setCrsLoading] = useState(false);

  // ✅ prevent double call in dev StrictMode
  const ranOnce = useRef(false);
  const route = useRouter();

  // ✅ country in lowercase + safe
  const countryLower = (user?.country ?? "").trim().toLowerCase();
  const isIndia = countryLower === "india";

  // ✅ Fetch CRS only if India
  useEffect(() => {
    if (userLoading) return;
    if (!user) return;

    if (!isIndia) {
      setInrRate(null);
      return;
    }

    let cancelled = false;

    const fetchCrs = async () => {
      try {
        setCrsLoading(true);

        const res = await fetch("/api/all-packages/crs", {
          method: "GET",
          headers: {
            Accept: "application/json",
            authorization: `Bearer ${token()}`,
          },
          cache: "no-store",
        });

        const json: CrsResponse = await safeJson(res);

        if (!res.ok) {
          throw new Error(json?.message || `CRS request failed (${res.status})`);
        }

        const rate = toNumber(json?.data?.value, 0);
        if (!cancelled) {
          setInrRate(rate > 0 ? rate : null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setInrRate(null);
          toast.error(e?.message ?? "Failed to load INR rate");
        }
      } finally {
        if (!cancelled) setCrsLoading(false);
      }
    };

    fetchCrs();

    return () => {
      cancelled = true;
    };
  }, [userLoading, user, isIndia]);

  // ✅ Load all plans (flat list) and split into Monthly / Long Term
  async function loadAllPlans() {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch("/api/all-packages/userpackage", {
        method: "GET",
        headers: {
          Accept: "application/json",
          authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const json: any = await safeJson(res);

      if (!res.ok) {
        console.error("PACKAGES API ERROR:", { status: res.status, json });
        throw new Error(json?.message || `Request failed (${res.status})`);
      }

      const list: ApiPlan[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      if (!Array.isArray(list)) {
        console.error("PACKAGES API invalid format:", json);
        throw new Error("Invalid API response format");
      }

      const { monthly, longterm } = splitPlans(list);

      setMonthlyPackages(monthly);
      setLongTermPackages(longterm);

      toast.success("Plans loaded", { position: "top-center" });
    } catch (e: any) {
      console.error("loadAllPlans failed:", e);
      setErrorMessage(e?.message ?? "Failed to load plans");
      setMonthlyPackages([]);
      setLongTermPackages([]);
      toast.error(e?.message ?? "Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    loadAllPlans();
  }, []);

  const rows = useMemo(() => {
    return tab === "monthly" ? monthlyPackages : longTermPackages;
  }, [tab, monthlyPackages, longTermPackages]);

  // ✅ Price display helper
  const displayPrice = (usd: number) => {
    // ✅ if price is 0, keep it 0 (don’t convert)
    if (usd <= 0) return { symbol: isIndia ? "₹" : "$", amount: 0 };

    if (isIndia && inrRate) {
      const inr = usd * inrRate;
      return { symbol: "₹", amount: inr };
    }
    return { symbol: "$", amount: usd };
  };

  const onBuy = async (row: PackageRow) => {
    // ✅ hard stop for free/0-price plans
    if (row.isFree) {
      toast.error("This plan is not purchasable right now.");
      return;
    }

    try {
      setCartLoadingId(row.id);
      const toastId = toast.loading(`Adding ${row.name} to cart...`);

      route.push(`/all-packages/invoices/${row.id}`);

      toast.success(`${row.name} added to cart`, { id: toastId });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add to cart");
    } finally {
      setCartLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin relative z-10" />
        </div>
        <p className="text-gray-600 font-medium animate-pulse">
          Loading packages...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 bg-red-50 rounded-2xl border border-red-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-red-500 text-2xl">!</span>
        </div>
        <p className="text-red-600 font-medium">{errorMessage}</p>
        <button
          onClick={loadAllPlans}
          className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-1">
              Choose Your Plan
            </h2>
            <p className="text-orange-100 text-sm">
              Select the perfect package for your email marketing needs
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setTab("monthly")}
              className={[
                "relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                tab === "monthly"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              <Calendar className="h-4 w-4" />
              Monthly Plan
              {tab === "monthly" && (
                <span className="absolute inset-0 rounded-lg ring-2 ring-orange-500/20"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("longterm")}
              className={[
                "relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                tab === "longterm"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              <Clock className="h-4 w-4" />
              Long Term Plan
              {tab === "longterm" && (
                <span className="absolute inset-0 rounded-lg ring-2 ring-orange-500/20"></span>
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 w-16 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">Package Name</div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Limit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Validity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">Speed</div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {rows.map((r, idx) => {
                const isThisLoading = cartLoadingId === r.id;
                const p = displayPrice(r.price);
                const isEven = idx % 2 === 0;

                // ✅ disable if: loading OR hideBuyBtn OR free price
                const isDisabled = isThisLoading || r.hideBuyBtn || r.isFree;

                return (
                  <tr
                    key={`${tab}-${r.id}`}
                    className={[
                      "group transition-colors duration-200 hover:bg-orange-50/30",
                      isEven ? "bg-white" : "bg-gray-50/30",
                    ].join(" ")}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                        {idx + 1}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                        {r.name}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {r.emailLimit === 0 ? "Unlimited" : r.emailLimit.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {r.validity}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-gray-400" />
                        {r.speed}
                      </div>
                    </td>

                    {/* ✅ Price with conversion */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900">
                          {p.symbol}
                          {p.amount.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {r.hideBuyBtn ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Not available
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBuy(r)}
                          disabled={isDisabled}
                          className={[
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                            isDisabled
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/25 active:scale-95",
                          ].join(" ")}
                          aria-label={`Buy ${r.name}`}
                          title={
                            r.isFree
                              ? "This plan is free (buy disabled)"
                              : "Add to cart"
                          }
                        >
                          {isThisLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-4 w-4" />
                          )}
                          {isThisLoading ? "Adding..." : r.isFree ? "Utilized" : "Buy Now"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td className="px-6 py-16 text-center" colSpan={7}>
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Package className="h-12 w-12 opacity-20" />
                      <p className="text-sm font-medium">
                        No packages found in this category.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">  
          {crsLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating currency rates...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}