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

type PackageRow = {
  id: number;
  name: string;
  emailLimit: number;
  validity: string;
  speed: string;
  price: number;
  rawValidDays: number;
  hideBuyBtn: boolean;
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
    isFree: price <= 0,
  };
}

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
  const [inrRate, setInrRate] = useState<number | null>(null);
  const [crsLoading, setCrsLoading] = useState(false);

  const ranOnce = useRef(false);
  const route = useRouter();

  const countryLower = (user?.country ?? "").trim().toLowerCase();
  const isIndia = countryLower === "india";

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
        if (!cancelled) setInrRate(rate > 0 ? rate : null);
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

  const displayPrice = (usd: number) => {
    if (usd <= 0) return { symbol: isIndia ? "₹" : "$", amount: 0 };

    if (isIndia && inrRate) {
      const inr = usd * inrRate;
      return { symbol: "₹", amount: inr };
    }
    return { symbol: "$", amount: usd };
  };

  const onBuy = async (row: PackageRow) => {
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
    <div className="w-full max-w-7xl mx-auto">
      <div
        className="overflow-hidden bg-[var(--surface)] shadow-[var(--shadow-soft)] border border-[color:var(--line-soft)]"
        style={{ borderRadius: "var(--page-radius)" }}
      >
        {/* Header */}
        <div className="relative px-6 py-6 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)]">
          <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')]" />
          <div className="relative z-10 animate-pulse">
            <div className="h-7 w-52 rounded-md bg-white/25 mb-2" />
            <div className="h-4 w-80 rounded-md bg-white/20" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 border-b border-[color:var(--line-soft)] bg-[var(--surface-2)]">
          <div className="flex gap-2 p-1 rounded-xl w-fit bg-[var(--surface-soft)]">
            <div className="h-10 w-32 rounded-lg bg-[var(--surface)] animate-pulse" />
            <div className="h-10 w-36 rounded-lg bg-[var(--surface)] animate-pulse" />
          </div>
        </div>

        {/* Desktop Table Skeleton */}
        <div className="w-full overflow-x-auto hidden md:block">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-2)] border-[color:var(--line-soft)]">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Package Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Email Limit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Validity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Speed
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[color:var(--line-soft)]">
              {[...Array(6)].map((_, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-2)]"}
                >
                  <td className="px-6 py-4">
                    <div className="h-8 w-8 rounded-full bg-[var(--surface-soft)] animate-pulse" />
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-2 animate-pulse">
                      <div className="h-5 w-40 rounded bg-[var(--surface-soft)]" />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="h-7 w-24 rounded-full bg-[var(--info-soft)] animate-pulse" />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 animate-pulse">
                      <div className="h-4 w-4 rounded bg-[var(--surface-soft)]" />
                      <div className="h-4 w-20 rounded bg-[var(--surface-soft)]" />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 animate-pulse">
                      <div className="h-4 w-4 rounded bg-[var(--surface-soft)]" />
                      <div className="h-4 w-16 rounded bg-[var(--surface-soft)]" />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-2 animate-pulse">
                      <div className="h-5 w-16 rounded bg-[var(--surface-soft)]" />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="h-10 w-28 rounded-lg bg-[var(--brand)]/20 animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Skeleton */}
        <div className="block md:hidden p-4 space-y-4 bg-[var(--surface)]">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[color:var(--line-soft)] bg-[var(--surface-2)] p-4 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 rounded bg-[var(--surface-soft)]" />
                <div className="h-6 w-16 rounded-full bg-[var(--info-soft)]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="h-3 w-14 rounded bg-[var(--surface-soft)]" />
                  <div className="h-4 w-20 rounded bg-[var(--surface-soft)]" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-14 rounded bg-[var(--surface-soft)]" />
                  <div className="h-4 w-16 rounded bg-[var(--surface-soft)]" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-14 rounded bg-[var(--surface-soft)]" />
                  <div className="h-4 w-16 rounded bg-[var(--surface-soft)]" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-14 rounded bg-[var(--surface-soft)]" />
                  <div className="h-4 w-14 rounded bg-[var(--surface-soft)]" />
                </div>
              </div>

              <div className="h-10 w-full rounded-xl bg-[var(--brand)]/20" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--surface-2)] border-t border-[color:var(--line-soft)]">
          <div className="h-4 w-36 rounded bg-[var(--surface-soft)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

  if (errorMessage) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center bg-[var(--danger-soft)] border-[color:var(--danger-soft)]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--surface)]">
          <span className="text-2xl text-[var(--danger)]">!</span>
        </div>
        <p className="font-medium text-[var(--danger)]">{errorMessage}</p>
        <button
          onClick={loadAllPlans}
          className="px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-[var(--surface)] border border-[color:var(--line-soft)] text-[var(--danger)] hover:bg-[var(--surface-soft)]"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className=" overflow-hidden bg-[var(--surface)] shadow-[var(--shadow-soft)] border border-[color:var(--line-soft)]" style={{ borderRadius: "var(--page-radius)" }}>
        <div className="bg-[var(--brand)] text-[var(--text-on-dark)]" style={{borderRadius: "var(--page-radius)"}}>
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Choose Your Plan</h1>
                <p className="mt-2 text-[var(--text-on-dark)]/80">
                Select the perfect package for your email marketing needs
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-[color:var(--line-soft)] bg-[var(--surface-2)]">
          <div className="flex gap-2 p-1 rounded-xl w-fit bg-[var(--surface-soft)]">
            <button
              type="button"
              onClick={() => setTab("monthly")}
              className={[
                "relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                tab === "monthly"
                  ? "bg-[var(--surface)] text-[var(--brand-strong)] shadow-sm"
                  : "text-[var(--text-soft)] hover:text-[var(--text-strong)]",
              ].join(" ")}
            >
              <Calendar className="h-4 w-4" />
              Monthly Plan
              {tab === "monthly" && (
                <span className="absolute inset-0 rounded-lg ring-2 ring-[var(--brand)]/20" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("longterm")}
              className={[
                "relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                tab === "longterm"
                  ? "bg-[var(--surface)] text-[var(--brand-strong)] shadow-sm"
                  : "text-[var(--text-soft)] hover:text-[var(--text-strong)]",
              ].join(" ")}
            >
              <Clock className="h-4 w-4" />
              Long Term Plan
              {tab === "longterm" && (
                <span className="absolute inset-0 rounded-lg ring-2 ring-[var(--brand)]/20" />
              )}
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-2)] border-[color:var(--line-soft)]">
                <th className="px-6 py-4 w-16 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Package Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Email Limit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Validity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Speed
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[color:var(--line-soft)]">
              {rows.map((r, idx) => {
                const isThisLoading = cartLoadingId === r.id;
                const p = displayPrice(r.price);
                const isEven = idx % 2 === 0;
                const isDisabled = isThisLoading || r.hideBuyBtn || r.isFree;

                return (
                  <tr
                    key={`${tab}-${r.id}`}
                    className={[
                      "group transition-colors duration-200 hover:bg-[var(--warning-soft)]/40",
                      isEven ? "bg-[var(--surface)]" : "bg-[var(--surface-2)]",
                    ].join(" ")}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors bg-[var(--surface-soft)] text-[var(--text-body)] group-hover:bg-[var(--warning-soft)] group-hover:text-[var(--brand-strong)]">
                        {idx + 1}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-lg transition-colors text-[var(--text-strong)] group-hover:text-[var(--brand-strong)]">
                        {r.name}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-lg font-medium bg-[var(--info-soft)] text-[var(--info)]">
                        {r.emailLimit === 0 ? "Unlimited" : r.emailLimit.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[var(--text-strong)]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[var(--text-strong)]" />
                        {r.validity}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[var(--text-strong)]">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-[var(--text-strong)]" />
                        {r.speed}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-lg text-[var(--text-strong)]">
                          {p.symbol}
                          {p.amount.toFixed(0)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {r.hideBuyBtn ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-soft)] text-[var(--text-faint)]">
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
                              ? "bg-[var(--surface-soft)] text-[var(--text-faint)] cursor-not-allowed"
                              : "bg-[var(--brand)] text-[var(--text-on-dark)] hover:bg-[var(--brand-strong)] hover:shadow-lg active:scale-95",
                          ].join(" ")}
                          aria-label={`Buy ${r.name}`}
                          title={r.isFree ? "This plan is free (buy disabled)" : "Add to cart"}
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
                    <div className="flex flex-col items-center gap-3 text-[var(--text-faint)]">
                      <Package className="h-12 w-12 opacity-20" />
                      <p className="text-sm font-medium">No packages found in this category.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-[var(--surface-2)] border-t border-[color:var(--line-soft)] flex items-center justify-between">
          {crsLoading && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating currency rates...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}