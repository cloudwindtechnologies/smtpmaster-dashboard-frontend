"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { token } from "../../common/http";
import { Loader2, RefreshCcw } from "lucide-react";

type ApiPlanRow = {
  plan_id: number;
  package_name: string;
  start_date: string;
  end_date: string;
  status: "Active" | "Expired" | "Upcoming" | string;
};

type ApiResponse = {
  draw?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  data: ApiPlanRow[];
};

function clearClientAuth() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_token");
    localStorage.removeItem("role");
  } catch {}
}

function toDateOnly(iso: string) {
  if (!iso) return "";
  return iso.split("T")[0];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Skeleton Row Component
function SkeletonRow() {
  return (
    <tr 
      className="border-b animate-pulse"
      style={{ borderColor: "var(--border)" }}
    >
      <td className="px-6 py-5 align-middle">
        <div 
          className="h-4 rounded w-3/4"
          style={{ backgroundColor: "var(--surface-2)" }}
        />
      </td>
      <td className="px-6 py-5 align-middle">
        <div 
          className="h-4 rounded w-24"
          style={{ backgroundColor: "var(--surface-2)" }}
        />
      </td>
      <td className="px-6 py-5 align-middle">
        <div 
          className="h-4 rounded w-24"
          style={{ backgroundColor: "var(--surface-2)" }}
        />
      </td>
      <td className="px-6 py-5 align-middle">
        <div 
          className="h-6 rounded w-16"
          style={{ backgroundColor: "var(--surface-2)" }}
        />
      </td>
    </tr>
  );
}

export default function MyPlans() {
  const [plans, setPlans] = useState<ApiPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [entries, setEntries] = useState(10);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/package-info/get_all_plans", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      if (res.status === 401) {
        clearClientAuth();
        window.location.href = "/login";
        return;
      }

      const json: ApiResponse | any = await res.json();

      if (!res.ok) {
        throw new Error(json?.errors || json?.message || "Failed to load plans");
      }

      setPlans(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // client-side search
  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => (p.package_name || "").toLowerCase().includes(q));
  }, [plans, search]);

  // reset to page 1 when search or entries changes
  useEffect(() => {
    setPage(1);
  }, [search, entries]);

  const totalEntries = filteredPlans.length;
  const pageSize = entries;

  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const currentPage = clamp(page, 1, totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);

  const pageRows = useMemo(() => {
    return filteredPlans.slice(startIndex, endIndex);
  }, [filteredPlans, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxButtons / 2);
    let start = currentPage - half;
    let end = currentPage + half;

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }
    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxButtons + 1;
    }

    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [totalPages, currentPage]);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = endIndex;

  // Enhanced status styling matching your orange theme
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Active":
        return {
          backgroundColor: "var(--success-soft)",
          color: "var(--success)",
          border: "1px solid color-mix(in oklch, var(--success) 30%, transparent)",
        };
      case "Upcoming":
        return {
          backgroundColor: "var(--info-soft)",
          color: "var(--info)",
          border: "1px solid color-mix(in oklch, var(--info) 30%, transparent)",
        };
      case "Expired":
        return {
          backgroundColor: "var(--danger-soft)",
          color: "var(--danger)",
          border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)",
        };
      default:
        return {
          backgroundColor: "var(--muted)",
          color: "var(--muted-foreground)",
          border: "1px solid var(--border)",
        };
    }
  };

  return (
    <div className="w-full space-y-6" style={{ backgroundColor: "var(--page-bg)" }}>
      {/* Plans History Card */}
      <div
        className="border overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          borderRadius: "var(--page-radius)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header - Orange themed like your other pages */}
        <div
          className="px-6 py-5 border-b"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--brand)",
            borderTopLeftRadius: "var(--page-radius)",
            borderTopRightRadius: "var(--page-radius)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="font-bold text-xl"
                style={{ color: "var(--text-on-dark)" }}
              >
                Plans History
              </h2>
              <p
                className="text-sm mt-1 opacity-90"
                style={{ color: "var(--text-on-dark)" }}
              >
                View and manage your subscription plans
              </p>
            </div>

            <button
              onClick={fetchPlans}
                 className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--refresh-button)] text-[var(--text-on-dark)] hover:bg-[var(--foreground)] transition-colors disabled:opacity-50"
              style={{borderRadius: "var(--page-radius)"}}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {/* Controls */}
        <div 
          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: "var(--text-soft)" }}>Show</span>
            <select
              className="border rounded px-3 py-2 outline-none transition-all focus:ring-2 font-medium"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--text-body)",
                borderRadius: "var(--page-radius)",
              }}
              value={entries}
              onChange={(e) => setEntries(Number(e.target.value))}
              disabled={loading}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span style={{ color: "var(--text-soft)" }}>entries</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: "var(--text-soft)" }}>Search:</span>
            <div className="relative">
              <input
                className="border rounded px-4 py-2 pl-10 outline-none transition-all focus:ring-2 w-64"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--text-body)",
                  borderRadius: "var(--page-radius)",
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loading}
                placeholder="Search by plan name..."
              />
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: "var(--text-soft)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr
                className="border-b"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                }}
              >
                <th
                  className="px-6 py-4 text-left font-semibold tracking-wide uppercase text-xs align-middle"
                  style={{ color: "var(--text-soft)" }}
                >
                  Plan Name
                </th>
                <th
                  className="px-6 py-4 text-left font-semibold tracking-wide uppercase text-xs align-middle"
                  style={{ color: "var(--text-soft)" }}
                >
                  Start Date
                </th>
                <th
                  className="px-6 py-4 text-left font-semibold tracking-wide uppercase text-xs align-middle"
                  style={{ color: "var(--text-soft)" }}
                >
                  End Date
                </th>
                <th
                  className="px-6 py-4 text-left font-semibold tracking-wide uppercase text-xs align-middle"
                  style={{ color: "var(--text-soft)" }}
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                // Skeleton Loading State
                <>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={index} />
                  ))}
                </>
              ) : totalEntries === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center align-middle"
                    style={{ color: "var(--text-soft)" }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--surface-2)" }}
                      >
                        <svg
                          className="w-8 h-8"
                          style={{ color: "var(--text-faint)" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <span className="text-base font-medium" style={{ color: "var(--text-body)" }}>
                        No plan history found
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-faint)" }}>
                        Try adjusting your search criteria
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((plan, index) => (
                  <tr
                    key={`${plan.plan_id}-${plan.start_date}`}
                    className="border-b transition-colors duration-200"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: index % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--surface-soft)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 
                        index % 2 === 0 ? "var(--surface)" : "var(--surface-2)";
                    }}
                  >
                    <td
                      className="px-6 py-5 font-medium align-middle"
                      style={{ color: "var(--text-strong)" }}
                    >
                      {plan.package_name}
                    </td>
                    <td
                      className="px-6 py-5 align-middle"
                      style={{ color: "var(--text-body)" }}
                    >
                      {toDateOnly(plan.start_date)}
                    </td>
                    <td
                      className="px-6 py-5 align-middle"
                      style={{ color: "var(--text-body)" }}
                    >
                      {toDateOnly(plan.end_date)}
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          ...getStatusStyle(plan.status),
                          borderRadius: "9999px",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mr-2"
                          style={{
                            backgroundColor: "currentColor",
                            opacity: 0.8,
                          }}
                        />
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer + Pagination */}
        <div
          className="px-6 py-4 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <div style={{ color: "var(--text-soft)" }}>
            Showing <span className="font-semibold" style={{ color: "var(--text-body)" }}>{showingFrom}</span> to{" "}
            <span className="font-semibold" style={{ color: "var(--text-body)" }}>{showingTo}</span> of{" "}
            <span className="font-semibold" style={{ color: "var(--text-body)" }}>{totalEntries}</span> entries
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1"
              style={{
                color: currentPage === 1 ? "var(--text-faint)" : "var(--text-body)",
                borderColor: "var(--border)",
                borderWidth: "1px",
                backgroundColor: "transparent",
                borderRadius: "var(--page-radius)",
              }}
              disabled={currentPage === 1 || loading || totalEntries === 0}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = "var(--brand)";
                  e.currentTarget.style.color = "var(--text-on-dark)";
                  e.currentTarget.style.borderColor = "var(--brand)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = 
                  currentPage === 1 ? "var(--text-faint)" : "var(--text-body)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {/* First + dots */}
            {totalPages > 5 && pageNumbers[0] !== 1 && (
              <>
                <button
                  className="px-3 py-2 rounded border transition-all duration-200 font-medium min-w-[40px]"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: currentPage === 1 ? "var(--brand)" : "transparent",
                    color: currentPage === 1 ? "var(--text-on-dark)" : "var(--text-body)",
                    borderRadius: "var(--page-radius)",
                  }}
                  onClick={() => setPage(1)}
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.backgroundColor = "var(--surface-soft)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  1
                </button>
                <span style={{ color: "var(--text-faint)" }}>…</span>
              </>
            )}

            {/* Middle pages */}
            {pageNumbers.map((n) => (
              <button
                key={n}
                className="px-3 py-2 rounded border transition-all duration-200 font-medium min-w-[40px]"
                style={{
                  borderColor: currentPage === n ? "var(--brand)" : "var(--border)",
                  backgroundColor: currentPage === n ? "var(--brand)" : "transparent",
                  color: currentPage === n ? "var(--text-on-dark)" : "var(--text-body)",
                  fontWeight: currentPage === n ? 600 : 400,
                  transform: currentPage === n ? "scale(1.05)" : "scale(1)",
                  boxShadow: currentPage === n ? "0 4px 12px color-mix(in oklch, var(--brand) 40%, transparent)" : "none",
                  borderRadius: "var(--page-radius)",
                }}
                onClick={() => setPage(n)}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (n !== currentPage) {
                    e.currentTarget.style.backgroundColor = "var(--surface-soft)";
                    e.currentTarget.style.borderColor = "var(--brand)";
                    e.currentTarget.style.color = "var(--brand)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (n !== currentPage) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-body)";
                  }
                }}
              >
                {n}
              </button>
            ))}

            {/* Last + dots */}
            {totalPages > 5 && pageNumbers[pageNumbers.length - 1] !== totalPages && (
              <>
                <span style={{ color: "var(--text-faint)" }}>…</span>
                <button
                  className="px-3 py-2 rounded border transition-all duration-200 font-medium min-w-[40px]"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: currentPage === totalPages ? "var(--brand)" : "transparent",
                    color: currentPage === totalPages ? "var(--text-on-dark)" : "var(--text-body)",
                    borderRadius: "var(--page-radius)",
                  }}
                  onClick={() => setPage(totalPages)}
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.backgroundColor = "var(--surface-soft)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              className="px-3 py-2 rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1"
              style={{
                color: currentPage === totalPages ? "var(--text-faint)" : "var(--text-body)",
                borderColor: "var(--border)",
                borderWidth: "1px",
                backgroundColor: "transparent",
                borderRadius: "var(--page-radius)",
              }}
              disabled={currentPage === totalPages || loading || totalEntries === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = "var(--brand)";
                  e.currentTarget.style.color = "var(--text-on-dark)";
                  e.currentTarget.style.borderColor = "var(--brand)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = 
                  currentPage === totalPages ? "var(--text-faint)" : "var(--text-body)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}