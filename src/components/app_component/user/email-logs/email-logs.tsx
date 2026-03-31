"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ApiLogRow = {
  bounceColumn: string;
  orig: string;
  rcpt: string;
  timeLogged: string;
  header_Subject: string;
};

type ApiResponse = {
  code: number;
  message: string;
  recordsTotal: number;
  recordsFiltered?: number;
  data: ApiLogRow[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
};

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

function getDownloadHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    Accept: "text/csv",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

function getStatusConfig(bounceColumn: string) {
  const column = bounceColumn?.toLowerCase() || "";
  if (column === "soft bounce" || column === "soft_bounce") {
    return { 
      label: "Soft Bounce", 
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-soft)]",
      border: "border-[var(--warning)]/20",
      icon: AlertCircle
    };
  } else if (column === "hard bounce" || column === "hard_bounce") {
    return { 
      label: "Hard Bounce", 
      color: "text-[var(--danger)]",
      bg: "bg-[var(--danger-soft)]",
      border: "border-[var(--danger)]/20",
      icon: XCircle
    };
  }
  return { 
    label: "Delivered", 
    color: "text-[var(--success)]",
    bg: "bg-[var(--success-soft)]",
    border: "border-[var(--success)]/20",
    icon: CheckCircle
  };
}

function toInt(val: any, fallback: number) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function formatYmdInput(value: string) {
  const cleaned = value.replace(/[^\d-]/g, "").slice(0, 10);
  const digits = cleaned.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function isValidYmdDate(value: string) {
  if (!value) return true;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, yyyy, mm, dd] = match;
  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function ymdToInputDate(value: string) {
  return isValidYmdDate(value) ? value : "";
}

function DateInputWithPicker({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const hiddenDateRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    if ((el as any).showPicker) {
      (el as any).showPicker();
    } else {
      el.focus();
      el.click();
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-[var(--text-soft)]">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="yyyy-mm-dd"
          value={value}
          onChange={(e) => onChange(formatYmdInput(e.target.value))}
          maxLength={10}
          className="w-full border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 pr-10 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
          style={{borderRadius: "var(--page-radius)"}}
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-soft)] hover:text-[var(--text-body)] transition-colors"
        >
          <Calendar className="h-4 w-4" />
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          value={ymdToInputDate(value)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute pointer-events-none opacity-0 w-0 h-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-[var(--danger)]">Invalid date format</p>
      )}
    </div>
  );
}

// Skeleton Loader Component
function TableSkeleton() {
  return (
    <tbody className="divide-y divide-[var(--line-soft)]">
      {[...Array(5)].map((_, idx) => (
        <tr key={idx} className="animate-pulse">
          <td className="px-4 py-3">
            <div className="h-6 w-24 bg-[var(--line-soft)] rounded"></div>
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-32 bg-[var(--line-soft)] rounded"></div>
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-36 bg-[var(--line-soft)] rounded"></div>
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-28 bg-[var(--line-soft)] rounded"></div>
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-48 bg-[var(--line-soft)] rounded"></div>
          </td>
          <td className="px-4 py-3">
            <div className="h-8 w-8 bg-[var(--line-soft)] rounded"></div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default function EmailLogsPage() {
  const [logCat, setLogCat] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchUi, setSearchUi] = useState("");
  const [dateError, setDateError] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchUi), 400);
    return () => clearTimeout(t);
  }, [searchUi]);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [rows, setRows] = useState<ApiLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [serverPerPage, setServerPerPage] = useState(10);
  const [serverPage, setServerPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [alldata, setAlldata] = useState(0);

  const requestSeq = useRef(0);

  const fromDateInvalid = fromDate.trim() !== "" && !isValidYmdDate(fromDate);
  const toDateInvalid = toDate.trim() !== "" && !isValidYmdDate(toDate);

  useEffect(() => {
    if (fromDateInvalid || toDateInvalid) {
      setDateError("Please enter date in yyyy-mm-dd format.");
      return;
    }
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be greater than To Date.");
      return;
    }
    setDateError("");
  }, [fromDateInvalid, toDateInvalid, fromDate, toDate]);

  const payload = useMemo(
    () => ({
      search: search.trim() || null,
      email_log_from_date: fromDate || null,
      email_log_to_date: toDate || null,
      log_cat: logCat || null,
      page,
      per_page: perPage,
    }),
    [search, fromDate, toDate, logCat, page, perPage]
  );

  const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);

  useEffect(() => {
    if (dateError) {
      setRows([]);
      setTotal(0);
      setLastPage(1);
      setServerPerPage(perPage);
      setServerPage(1);
      return;
    }

    const controller = new AbortController();
    const seq = ++requestSeq.current;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch(`/api/email-logs/all_logs`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: payloadKey,
          signal: controller.signal,
          cache: "no-store",
        });

        const json: ApiResponse = await res.json().catch(() => ({} as any));

        if (seq !== requestSeq.current) return;

        if (!res.ok || json?.code !== 200) {
          throw new Error((json as any)?.errors || json?.message || `Failed to load logs (${res.status})`);
        }

        const data = Array.isArray(json.data) ? json.data : [];
        const totalData = json?.recordsTotal ?? 0;

        setAlldata(totalData);
        setRows(data);
        setTotal(Number(totalData));

        const cp = toInt(json.current_page, page);
        const lp = toInt(json.last_page, 1);
        const pp = toInt(json.per_page, perPage);

        setServerPage(cp);
        setLastPage(lp);
        setServerPerPage(pp);

        if (cp !== page) setPage(cp);
        if (pp !== perPage) setPerPage(pp);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (seq !== requestSeq.current) return;

        setRows([]);
        setTotal(0);
        setLastPage(1);
        setServerPerPage(perPage);
        setServerPage(1);
        setErrorMsg(err?.message || "Something went wrong");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [payloadKey, page, perPage, dateError]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger a re-fetch by updating a ref or forcing a re-run of the effect
    requestSeq.current++;
    setPage(1);
    // Small delay to show skeleton
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const downloadLogs = async () => {
    try {
      if (dateError) {
        setErrorMsg(dateError);
        return;
      }

      setDownloading(true);
      setErrorMsg("");

      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (fromDate) params.append("email_log_from_date", fromDate);
      if (toDate) params.append("email_log_to_date", toDate);
      if (logCat) params.append("log_cat", logCat);

      const res = await fetch(`/api/email-logs/export_logs?${params.toString()}`, {
        method: "GET",
        headers: getDownloadHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try {
          const json = await res.json();
          msg = json?.errors || json?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = res.headers.get("Content-Disposition");
      let fileName = "email_logs.csv";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) fileName = match[1];
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to download logs");
    } finally {
      setDownloading(false);
    }
  };

  const safePage = Math.min(page, Math.max(1, lastPage));
  const showingFrom = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const showingTo = Math.min(total, safePage * perPage);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  const [pageInput, setPageInput] = useState("1");
  useEffect(() => setPageInput(String(safePage)), [safePage]);

  const canPrev = safePage > 1 && !loading;
  const canNext = safePage < lastPage && !loading;

  const pageNumbers = useMemo(() => {
    const lp = Math.max(1, lastPage);
    const p = safePage;
    const out: (number | "...")[] = [];
    
    if (lp <= 7) {
      for (let i = 1; i <= lp; i++) out.push(i);
      return out;
    }
    
    out.push(1);
    if (p > 3) out.push("...");
    const start = Math.max(2, p - 1);
    const end = Math.min(lp - 1, p + 1);
    for (let i = start; i <= end; i++) out.push(i);
    if (p < lp - 2) out.push("...");
    out.push(lp);
    return out;
  }, [lastPage, safePage]);



  // Case-insensitive filter for client-side (if needed)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const searchLower = search.toLowerCase();
    return rows.filter(row => 
      row.orig?.toLowerCase().includes(searchLower) ||
      row.rcpt?.toLowerCase().includes(searchLower) ||
      row.header_Subject?.toLowerCase().includes(searchLower) ||
      row.bounceColumn?.toLowerCase().includes(searchLower)
    );
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-[var(--page-bg)]" style={{borderRadius: "var(--page-radius)"}}>
      {/* Header */}
      <div className="bg-[var(--brand)] text-[var(--text-on-dark)]" style={{borderRadius: "var(--page-radius)"}}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Email Logs</h1>
              <p className="mt-1 text-[var(--text-on-dark)]/80">
                Track delivery status and bounce reports
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--refresh-button)] text-[var(--text-on-dark)] hover:bg-[var(--foreground)] transition-colors disabled:opacity-50"
              style={{borderRadius: "var(--page-radius)"}}
            >
              {(loading || isRefreshing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-soft)]">Log Category</label>
              <select
                value={logCat}
                onChange={(e) => {
                  setLogCat(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                style={{borderRadius: "var(--page-radius)"}}
              >
                <option value="">All</option>
                <option value="delivered">Delivered</option>
                <option value="soft_bounce">Soft Bounce</option>
                <option value="hard_bounce">Hard Bounce</option>
                <option value="bounce">All Bounces</option>
              </select>
            </div>

            <DateInputWithPicker
              label="From Date"
              value={fromDate}
              onChange={(value) => {
                setFromDate(value);
                setPage(1);
              }}
              invalid={fromDateInvalid}
            />

            <DateInputWithPicker
              label="To Date"
              value={toDate}
              onChange={(value) => {
                setToDate(value);
                setPage(1);
              }}
              invalid={toDateInvalid}
            />

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-soft)]">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  value={searchUi}
                  onChange={(e) => {
                    setSearchUi(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-[var(--line-soft)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
                  style={{borderRadius: "var(--page-radius)"}}
                  placeholder="subject, sender, recipient... (case-insensitive)"
                />
              </div>
            </div>
          </div>

          {dateError && (
            <div className="mt-3 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
              {dateError}
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--line-strong)]"
              style={{borderRadius: "var(--page-radius)"}}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-soft)]">
              Showing <span className="font-semibold text-[var(--text-strong)]">{showingFrom}</span> to{" "}
              <span className="font-semibold text-[var(--text-strong)]">{showingTo}</span> of{" "}
              <span className="font-semibold text-[var(--text-strong)]">{total.toLocaleString()}</span>
            </span>
            <button
              onClick={downloadLogs}
              disabled={downloading || loading || total === 0 || !!dateError}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-[var(--text-on-dark)] text-sm font-medium hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-50"
              style={{borderRadius: "var(--page-radius)"}}
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading..." : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-[var(--line-soft)] bg-[var(--surface)] shadow-[var(--shadow-panel)] overflow-hidden" style={{borderRadius: "var(--page-radius)"}}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line-soft)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] w-[12%] whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] w-[20%] whitespace-nowrap">
                    Sender
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] w-[20%] whitespace-nowrap">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] w-[13%] whitespace-nowrap">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] w-[25%]">
                    Subject
                  </th>
                  
                </tr>
              </thead>

              {(loading || isRefreshing) && rows.length === 0 ? (
                <TableSkeleton />
              ) : filteredRows.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-[var(--text-soft)]">
                      <div className="flex flex-col items-center gap-2">
                        <Mail className="h-12 w-12 text-[var(--line-soft)]" />
                        <p>No logs found</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-[var(--line-soft)]">
                  {filteredRows.map((r, idx) => {
                    const status = getStatusConfig(r.bounceColumn);
                    const StatusIcon = status.icon;
                  
                    
                    return (
                      <React.Fragment key={`${r.timeLogged}-${idx}`}>
                        <tr className="transition-colors hover:bg-[var(--surface-soft)]">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border ${status.border} ${status.bg} ${status.color} px-2.5 py-1 text-xs font-semibold whitespace-nowrap`}>
                              <StatusIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{status.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-body)] font-mono text-xs ">
                            {r.orig}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-body)] ">
                            {r.rcpt}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-soft)] text-xs whitespace-nowrap">
                            {r.timeLogged.split('+')[0]}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-body)] max-w-xs ">
                            {r.header_Subject}
                          </td>
                          
                        </tr>
                        
                      </React.Fragment>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-4 gap-3">
            <div className="text-sm text-[var(--text-soft)]">
              Showing <span className="font-semibold text-[var(--text-strong)]">{alldata === 0 ? 0 : (serverPage - 1) * serverPerPage + 1}</span> to{" "}
              <span className="font-semibold text-[var(--text-strong)]">{Math.min(serverPage * serverPerPage, alldata)}</span> of{" "}
              <span className="font-semibold text-[var(--text-strong)]">{alldata.toLocaleString()}</span> entries
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={!canPrev}
                className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                style={{borderRadius: "var(--page-radius)"}}
                title="First"
              >
                <ChevronsLeft className="h-4 w-4" />
                First
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                style={{borderRadius: "var(--page-radius)"}}
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-xs text-[var(--text-faint)]">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      disabled={loading}
                      className={`px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                        p === safePage 
                          ? 'bg-[var(--brand)] text-[var(--text-on-dark)]' 
                          : 'border border-[var(--line-soft)] bg-[var(--surface)] text-[var(--text-body)] hover:bg-[var(--surface-soft)]'
                      }`}
                      style={{borderRadius: "var(--page-radius)"}}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={!canNext}
                className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                style={{borderRadius: "var(--page-radius)"}}
                title="Next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPage(lastPage)}
                disabled={!canNext}
                className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                style={{borderRadius: "var(--page-radius)"}}
                title="Last"
              >
                Last
                <ChevronsRight className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-[var(--text-soft)]">Go</span>
                <input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = Math.min(lastPage, Math.max(1, Number(pageInput || "1")));
                      setPage(n);
                    }
                  }}
                  className="w-16 border border-[var(--line-soft)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--text-strong)] outline-none focus:border-[var(--line-strong)]"
                  style={{borderRadius: "var(--page-radius)"}}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = Math.min(lastPage, Math.max(1, Number(pageInput || "1")));
                    setPage(n);
                  }}
                  disabled={loading}
                  className="border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                  style={{borderRadius: "var(--page-radius)"}}
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}