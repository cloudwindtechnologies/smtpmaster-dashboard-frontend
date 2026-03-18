"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Calendar,
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

function badge(bounceColumn: string) {
  if (bounceColumn === "Soft Bounce" || bounceColumn === "Hard Bounce") {
    return { label: "Bounced", cls: "bg-red-500 text-white" };
  }
  return { label: "Delivered", cls: "bg-green-600 text-white" };
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
      <label className="block text-[11px] font-semibold text-gray-700 mb-1">{label}</label>

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="yyyy-mm-dd"
          value={value}
          onChange={(e) => onChange(formatYmdInput(e.target.value))}
          maxLength={10}
          className={`w-full rounded border bg-white px-3 py-2 pr-10 text-xs outline-none ${
            invalid ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
          }`}
        />

        <button
          type="button"
          onClick={openPicker}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
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
    </div>
  );
}

export default function EmailLogsPage() {
  const [logCat, setLogCat] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchUi, setSearchUi] = useState("");
  const [dateError, setDateError] = useState("");

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
  const [alldata, useAlldata] = useState(0);

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

        useAlldata(totalData);
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
    const push = (v: number | "...") => out.push(v);

    if (lp <= 7) {
      for (let i = 1; i <= lp; i++) push(i);
      return out;
    }

    push(1);
    if (p > 3) push("...");

    const start = Math.max(2, p - 1);
    const end = Math.min(lp - 1, p + 1);
    for (let i = start; i <= end; i++) push(i);

    if (p < lp - 2) push("...");
    push(lp);

    return out;
  }, [lastPage, safePage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4">
        <h1 className="text-sm font-semibold text-gray-800 mb-3">Email Logs</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Log Category</label>
            <select
              value={logCat}
              onChange={(e) => {
                setLogCat(e.target.value);
                setPage(1);
              }}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
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
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Search All</label>
            <input
              value={searchUi}
              onChange={(e) => {
                setSearchUi(e.target.value);
                setPage(1);
              }}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
              placeholder="subject, sender, recipient..."
            />
            <div className="mt-1 text-[10px] text-gray-500">
              Tip: search is debounced (400ms) for smoother performance.
            </div>
          </div>
        </div>

        {dateError ? (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {dateError}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700">Show</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-700">entries</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-gray-600">
              {loading ? "Loading..." : `Showing ${showingFrom} to ${showingTo} of ${total} entries`}
            </div>

            <button
              type="button"
              onClick={downloadLogs}
              disabled={downloading || loading || total === 0 || !!dateError}
              className="inline-flex items-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading..." : "Download Logs"}
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="rounded border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <Th>Status</Th>
                  <Th>Sender / Bounce ID</Th>
                  <Th>Recipient</Th>
                  <Th>Time</Th>
                  <Th>Subject</Th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const b = badge(r.bounceColumn);
                    return (
                      <tr key={`${r.timeLogged}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <Td>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>
                            {b.label}
                          </span>
                        </Td>
                        <Td className="text-gray-700">{r.orig}</Td>
                        <Td className="text-gray-700">{r.rcpt}</Td>
                        <Td className="text-gray-600">{r.timeLogged}</Td>
                        <Td className="text-gray-700">{r.header_Subject}</Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-3 border-t border-gray-100">
            <div className="text-[11px] text-gray-600">
              Showing{" "}
              <span className="font-semibold">
                {alldata === 0 ? 0 : (serverPage - 1) * serverPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">{Math.min(serverPage * serverPerPage, alldata)}</span> of{" "}
              <span className="font-semibold">{alldata.toLocaleString()}</span> entries
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={!canPrev}
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
                title="First"
              >
                <ChevronsLeft className="h-4 w-4" />
                First
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-[11px] text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      disabled={loading}
                      className={`rounded border px-2 py-1 text-[11px] ${
                        p === safePage
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      } disabled:opacity-50`}
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
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
                title="Next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPage(lastPage)}
                disabled={!canNext}
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
                title="Last"
              >
                Last
                <ChevronsRight className="h-4 w-4" />
              </button>

              <div className="ml-1 flex items-center gap-1">
                <span className="text-[11px] text-gray-600">Go</span>
                <input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = Math.min(lastPage, Math.max(1, Number(pageInput || "1")));
                      setPage(n);
                    }
                  }}
                  className="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] outline-none focus:border-blue-500"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = Math.min(lastPage, Math.max(1, Number(pageInput || "1")));
                    setPage(n);
                  }}
                  disabled={loading}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
                >
                  Go
                </button>
              </div>

              <span className="ml-2 text-[11px] text-gray-700">
                Page {safePage} / {Math.max(1, lastPage)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-semibold text-gray-700 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}