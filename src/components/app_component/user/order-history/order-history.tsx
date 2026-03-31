"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { 
  Eye, 
  Loader2, 
  RefreshCcw, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  FileText, 
  CreditCard, 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Package,
  Clock,
  Search,
  Landmark
} from "lucide-react";
import { token } from "../../common/http";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type OrderRow = {
  email: string;
  invoice_id: string | null;
  method: string;
  created_on: string | null;
};

type ApiResponse = {
  code: number;
  message: string;
  data: {
    current_page: number;
    data: OrderRow[];
    per_page: number;
    total: number;
    last_page: number;
  } | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { __raw: text };
  }
}

export default function OrderHistory() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [entries, setEntries] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ranOnce = useRef(false);
  const route = useRouter();

  async function loadOrders(silent = false) {
    try {
      if (!silent) setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch(`/api/order_history`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const jsonText = await res.text();
      const json: ApiResponse = jsonText ? JSON.parse(jsonText) : ({} as any);

      if (!res.ok || json?.code !== 200) {
        throw new Error(json?.message || `Request failed (${res.status})`);
      }

      const list = json?.data?.data || [];
      setRows(Array.isArray(list) ? list : []);
      setPage(1);
    } catch (e: any) {
      setRows([]);
      setErrorMessage(e?.message ?? "Failed to load order history");
      if (!silent) toast.error(e?.message ?? "Failed to load order history");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    loadOrders(false);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const email = (r.email ?? "").toLowerCase();
      const invoice = (r.invoice_id ?? "").toLowerCase();
      const method = (r.method ?? "").toLowerCase();
      const date = (r.created_on ?? "").toLowerCase();

      return (
        email.includes(q) ||
        invoice.includes(q) ||
        method.includes(q) ||
        date.includes(q)
      );
    });
  }, [rows, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / entries));
  const safePage = Math.min(page, totalPages);

  const startIndex = total === 0 ? 0 : (safePage - 1) * entries;
  const endIndexExclusive = Math.min(startIndex + entries, total);
  const pageRows = filtered.slice(startIndex, endIndexExclusive);

  const toggleExpand = (invoiceId: string | null) => {
    setExpandedId(prev => prev === invoiceId ? null : (invoiceId || null));
  };

  const onView = (row: OrderRow) => {
    if (row.invoice_id) {
      route.push(`/order-history/${row.invoice_id}`);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders(true);
    setIsRefreshing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Advanced Skeleton Loading Component
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] animate-pulse" style={{borderRadius: "var(--page-radius)"}}>
        {/* Header Skeleton */}
        <div className="bg-[var(--brand)]/80" style={{borderRadius: "var(--page-radius)"}}>
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-3">
                <div className="h-8 w-64 bg-[var(--surface)]/20 rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-4 w-96 bg-[var(--surface)]/10 rounded" style={{borderRadius: "var(--page-radius)"}}></div>
              </div>
              <div className="h-10 w-32 bg-[var(--surface)]/20 rounded" style={{borderRadius: "var(--page-radius)"}}></div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
                <div className="h-4 w-24 bg-[var(--surface-soft)] rounded mb-2" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-8 w-16 bg-[var(--surface-soft-2)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
              </div>
            ))}
          </div>

          {/* Search Bar Skeleton */}
          <div className="mb-6 border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-10 w-20 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
              </div>
              <div className="h-10 w-full sm:w-96 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="border border-[var(--line-soft)] bg-[var(--surface)] shadow-[var(--shadow-panel)] overflow-hidden" style={{borderRadius: "var(--page-radius)"}}>
            {/* Table Header */}
            <div className="border-b border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-4">
              <div className="flex gap-4">
                <div className="h-4 w-1/4 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-4 w-1/4 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-4 w-1/6 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-4 w-1/6 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-4 w-24 ml-auto bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
              </div>
            </div>

            {/* Table Rows Skeleton */}
            <div className="divide-y divide-[var(--line-soft)]">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex items-center gap-3 w-1/4">
                    <div className="h-10 w-10 bg-[var(--surface-soft)] rounded-lg flex-shrink-0" style={{borderRadius: "var(--page-radius)"}}></div>
                    <div className="h-4 w-full bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                  </div>
                  <div className="h-4 w-1/4 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                  <div className="h-6 w-20 bg-[var(--surface-soft)] rounded-full" style={{borderRadius: "var(--page-radius)"}}></div>
                  <div className="h-4 w-1/6 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                  <div className="h-8 w-24 ml-auto bg-[var(--surface-soft-2)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-4 flex items-center justify-between">
              <div className="h-4 w-48 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-8 w-8 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
                <div className="h-8 w-24 bg-[var(--surface-soft)] rounded" style={{borderRadius: "var(--page-radius)"}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] p-8" style={{borderRadius: "var(--page-radius)"}}>
        <div className="max-w-4xl mx-auto border border-[var(--line-soft)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-panel)]" style={{borderRadius: "var(--page-radius)"}}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--danger-soft)] mb-4">
            <FileText className="h-8 w-8 text-[var(--danger)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-strong)] mb-2">Failed to Load Orders</h2>
          <p className="text-[var(--danger)] mb-6">{errorMessage}</p>
          <button
            onClick={() => loadOrders(false)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand)] text-[var(--text-on-dark)] font-medium hover:bg-[var(--brand-strong)] transition-colors"
            style={{borderRadius: "var(--page-radius)"}}
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)]" style={{borderRadius: "var(--page-radius)"}}>
      {/* Header */}
      <div className="bg-[var(--brand)] text-[var(--text-on-dark)]" style={{borderRadius: "var(--page-radius)"}}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Order History
              </h1>
              <p className="mt-2 text-[var(--text-on-dark)]/80">
                View and manage your purchase history
              </p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--refresh-button)] text-[var(--text-on-dark)] hover:bg-[var(--foreground)] transition-colors disabled:opacity-50"
              style={{borderRadius: "var(--page-radius)"}}
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Search and Controls */}
        <div className="mb-6 border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
              <span>Show</span>
              <select
                className="border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--line-strong)]"
                style={{borderRadius: "var(--page-radius)"}}
                value={entries}
                onChange={(e) => {
                  setEntries(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                className="w-full border border-[var(--line-soft)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                style={{borderRadius: "var(--page-radius)"}}
                value={search}
                placeholder="Search by email, invoice ID, method..."
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border border-[var(--line-soft)] bg-[var(--surface)] shadow-[var(--shadow-panel)] overflow-hidden" style={{borderRadius: "var(--page-radius)"}}>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line-soft)] bg-[var(--surface-2)]">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)] w-[25%]">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                    Invoice ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                   Method
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--line-soft)]">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-[var(--text-soft)]">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-[var(--line-soft)]" />
                        <p>No orders found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const isExpanded = expandedId === row.invoice_id;
                    const uniqueKey = row.invoice_id || `row-${idx}`;
                    
                    return (
                      <React.Fragment key={idx}>
                        <tr
                          className={`transition-colors hover:bg-[var(--surface-soft)] ${
                            isExpanded ? "bg-[var(--brand-soft)]/30" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 ${isExpanded ? 'bg-[var(--brand)] text-[var(--text-on-dark)]' : 'bg-[var(--surface-soft)] text-[var(--text-soft)]'}`} style={{borderRadius: "var(--page-radius)"}}>
                                <Mail className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-[var(--text-strong)]">{row.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[var(--text-body)] font-mono text-xs">
                            {row.invoice_id || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--text-body)]">
                              {row.method=='upi'?(<Landmark className="h-3 w-3"/>):(<CreditCard className="h-3 w-3" />)}
                              
                              {row.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[var(--text-body)] text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                              {formatDate(row.created_on)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleExpand(row.invoice_id)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all ${
                                isExpanded 
                                  ? 'bg-[var(--brand)] text-[var(--text-on-dark)] hover:bg-[var(--brand-strong)]' 
                                  : 'bg-[var(--surface-soft)] text-[var(--text-body)] hover:bg-[var(--surface-soft-2)]'
                              }`}
                              style={{borderRadius: "var(--page-radius)"}}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  Close
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4" />
                                  View
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Details */}
                        <tr>
                          <td colSpan={5} className="p-0">
                            <div 
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                              }`}
                            >
                              <div className="border-t border-[var(--brand)]/20 bg-[var(--surface-2)] p-6">
                             
                                <div className="mt-4 flex items-center justify-between border border-[var(--line-soft)] bg-[var(--surface)] p-4" style={{borderRadius: "var(--page-radius)"}}>
                                  <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                                    <FileText className="h-4 w-4" />
                                    <span>Need to download or print this invoice?</span>
                                  </div>
                                  <button
                                    onClick={() => onView(row)}
                                    disabled={!row.invoice_id}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[var(--brand)] text-[var(--text-on-dark)] hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-50"
                                    style={{borderRadius: "var(--page-radius)"}}
                                  >
                                    Open Invoice Page
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-4">
            <div className="text-sm text-[var(--text-soft)]">
              Showing <span className="font-semibold text-[var(--text-strong)]">{total === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-[var(--text-strong)]">{endIndexExclusive}</span> of{" "}
              <span className="font-semibold text-[var(--text-strong)]">{total}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{borderRadius: "var(--page-radius)"}}
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="px-4 py-2 text-sm font-medium text-[var(--text-strong)]">
                Page {safePage} of {totalPages}
              </span>

              <button
                className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{borderRadius: "var(--page-radius)"}}
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}