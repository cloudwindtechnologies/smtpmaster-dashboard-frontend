"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2, RefreshCcw } from "lucide-react";
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

export default function OrderHistory() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [entries, setEntries] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const ranOnce = useRef(false);

  const route=useRouter();

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

  const showingText =
    total === 0
      ? "Showing 0 to 0 of 0 entries"
      : `Showing ${startIndex + 1} to ${endIndexExclusive} of ${total} entries`;

  const onView = (row: OrderRow) => {
    route.push(`/order-history/${row.invoice_id }`)
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders(true);
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-lg border border-border bg-card p-10">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading order history...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="w-full rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">Order History</h2>
          <button
            type="button"
            onClick={() => loadOrders(false)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
        <div className="px-4 py-10 text-sm text-destructive">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border bg-card shadow-sm">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Order History</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your recent purchases and invoices
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {/* Top controls */}
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Search:</span>
          <input
            className="w-56 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            value={search}
            placeholder="Email, invoice, method, date..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/40 text-foreground">
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Invoice ID</th>
              <th className="px-4 py-3 text-left font-semibold">Payment Method</th>
              <th className="px-4 py-3 text-left font-semibold">Payment Date</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No data available in table
                </td>
              </tr>
            ) : (
              pageRows.map((r, idx) => (
                <tr
                  key={`${r.invoice_id ?? "no-invoice"}-${idx}`}
                  className="border-b border-border hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-foreground">{r.invoice_id ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{r.method}</td>
                  <td className="px-4 py-3 text-foreground">{r.created_on ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onView(r)}
                      className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                      aria-label={`View ${r.invoice_id ?? "invoice"}`}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr className="border-t border-border bg-muted/40 text-foreground">
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Invoice ID</th>
              <th className="px-4 py-3 text-left font-semibold">Payment Method</th>
              <th className="px-4 py-3 text-left font-semibold">Payment Date</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom controls */}
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-muted-foreground">{showingText}</div>

        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>

          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
