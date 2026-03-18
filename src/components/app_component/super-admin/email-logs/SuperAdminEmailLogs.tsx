"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  FileText,
  X,
} from "lucide-react";

type ApiLogRow = {
  id: number;
  vmtaPool: string;
  orig: string;
  rcpt: string;
  timeLogged: string;
  queue: string;
  bounce: string;
  dsnStatus: string;
  dsnDiag: string;
  header_Message_Id: string | null;
  header_Subject: string | null;
  header_X_UC: string | null;
  dlvSourceIp: string;
  dlvType: string;
};

type LogsResponseDT = {
  draw?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  data?: ApiLogRow[];
  error?: string;
  message?: string;
  errors?: any;
};

type UserItem = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type UsersApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    data?: {
      current_page?: number;
      last_page?: number;
      per_page?: number;
      total?: number;
      data?: UserItem[];
    };
  };
};

const LOGS_API_URL = "/api/email-logs"; // should point to admin_all_logs route in your Next API proxy
const USERS_API_BASE = "/api/email-account-setting/email-configuration/getUser";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

function toInt(val: any, fallback: number) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function statusBadge(bounce: string) {
  const v = (bounce || "").toLowerCase();
  if (v.includes("hard")) return { label: bounce, color: "bg-red-100 text-red-800", icon: XCircle };
  if (v.includes("soft")) return { label: bounce, color: "bg-amber-100 text-amber-800", icon: XCircle };
  if (v.includes("bounce")) return { label: bounce, color: "bg-amber-100 text-amber-800", icon: AlertCircle };
  return { label: bounce || "Delivered", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle };
}

export default function AdminAllEmailLogsPage() {
  // ✅ do not load logs by default
  const [logsEnabled, setLogsEnabled] = useState(false);

  // -------- Users filter --------
  const [allUsers, setAllUsers] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [usersLastPage, setUsersLastPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearchUi, setUserSearchUi] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setUserSearch(userSearchUi.trim());
      setUsersPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchUi]);

  const toggleUser = (id: number) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // load users list only when allUsers is off
  useEffect(() => {
    if (allUsers) return;

    const controller = new AbortController();

    (async () => {
      try {
        setUsersLoading(true);
        setUsersError("");

        const qParam = userSearch ? `&q=${encodeURIComponent(userSearch)}` : "";
        const url = `${USERS_API_BASE}?page=${usersPage}&per_page=${usersPerPage}${qParam}`;

        const res = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
          signal: controller.signal,
          cache: "no-store",
        });

        const json: UsersApiResponse = await res.json().catch(() => ({} as any));
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || `Failed to load users (${res.status})`);
        }

        const pageData = json?.data?.data;
        const list = Array.isArray(pageData?.data) ? pageData!.data! : [];

        setUsers(list);
        setUsersPage(toInt(pageData?.current_page, usersPage));
        setUsersLastPage(toInt(pageData?.last_page, 1));
        setUsersPerPage(toInt(pageData?.per_page, usersPerPage));
        setUsersTotal(Number(pageData?.total ?? 0));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setUsers([]);
        setUsersError(e?.message || "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    })();

    return () => controller.abort();
  }, [allUsers, usersPage, usersPerPage, userSearch]);

  // -------- Logs filters --------
  const [logCat, setLogCat] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchUi, setSearchUi] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchUi.trim()), 400);
    return () => clearTimeout(t);
  }, [searchUi]);

  // -------- Logs state (DataTables paging) --------
  const [page, setPage] = useState(1); // UI page 1..N
  const [perPage, setPerPage] = useState(25); // maps to DataTables "length"

  const [rows, setRows] = useState<ApiLogRow[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0); // DataTables recordsFiltered
  const [totalAll, setTotalAll] = useState(0); // DataTables recordsTotal (optional display)

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const requestSeq = useRef(0);
  const drawRef = useRef(1);

  // modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState<ApiLogRow | null>(null);

  const start = useMemo(() => (page - 1) * perPage, [page, perPage]);
  const lastPage = useMemo(() => Math.max(1, Math.ceil(totalFiltered / perPage)), [totalFiltered, perPage]);

  const canPrev = logsEnabled && page > 1 && !loading;
  const canNext = logsEnabled && page < lastPage && !loading;

  const showingFrom = totalFiltered === 0 ? 0 : start + 1;
  const showingTo = Math.min(totalFiltered, start + perPage);

  // ✅ DataTables payload (MATCHES YOUR PHP)
  const dtPayload = useMemo(() => {
    return {
      draw: drawRef.current,
      start,
      length: perPage,
      search: { value: search || "" },

      // your extra filters
      email_log_from_date: fromDate || null,
      email_log_to_date: toDate || null,
      log_cat: logCat || null,

      // ✅ (you asked) user filters
      // NOTE: backend currently DOES NOT use these yet — see backend patch below.
      all_users: allUsers,
      user_ids: allUsers ? [] : selectedUserIds,
    };
  }, [start, perPage, search, fromDate, toDate, logCat, allUsers, selectedUserIds]);

  const dtPayloadKey = useMemo(() => JSON.stringify(dtPayload), [dtPayload]);

  const disableLogsAndClear = () => {
    setLogsEnabled(false);
    setRows([]);
    setTotalFiltered(0);
    setTotalAll(0);
    setErrorMsg("");
    setPage(1);
  };

  // ✅ Fetch logs (DataTables server-side)
  useEffect(() => {
    if (!logsEnabled) return;
    if (!allUsers && selectedUserIds.length === 0) return; // must choose something

    const controller = new AbortController();
    const seq = ++requestSeq.current;

    drawRef.current += 1;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch(LOGS_API_URL, {
          method: "POST",
          headers: getAuthHeaders(),
          body: dtPayloadKey,
          signal: controller.signal,
          cache: "no-store",
        });

        const json: LogsResponseDT = await res.json().catch(() => ({} as any));
        if (seq !== requestSeq.current) return;

        if (!res.ok) {
          throw new Error((json as any)?.error || (json as any)?.errors || json?.message || `Failed (${res.status})`);
        }

        const list = Array.isArray(json?.data) ? json.data : [];
        const rt = Number(json?.recordsTotal ?? 0);
        const rf = Number(json?.recordsFiltered ?? 0);

        setRows(list);
        setTotalAll(rt);
        setTotalFiltered(rf);

        // if user is on page > lastPage after filter change, clamp
        const newLast = Math.max(1, Math.ceil(rf / perPage));
        if (page > newLast) setPage(1);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (seq !== requestSeq.current) return;

        setRows([]);
        setTotalAll(0);
        setTotalFiltered(0);
        setErrorMsg(err?.message || "Something went wrong");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [dtPayloadKey, logsEnabled, allUsers, selectedUserIds.length, perPage, page]);

  // CSV export current page
  const exportCsv = () => {
    if (!rows.length) return;

    const headers = [
      "id",
      "vmtaPool",
      "orig",
      "rcpt",
      "timeLogged",
      "queue",
      "bounce",
      "dsnStatus",
      "dsnDiag",
      "header_Message_Id",
      "header_Subject",
      "header_X_UC",
      "dlvSourceIp",
      "dlvType",
    ];

    const esc = (v: any) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.vmtaPool,
          r.orig,
          r.rcpt,
          r.timeLogged,
          r.queue,
          r.bounce,
          r.dsnStatus,
          r.dsnDiag,
          r.header_Message_Id,
          r.header_Subject,
          r.header_X_UC,
          r.dlvSourceIp,
          r.dlvType,
        ]
          .map(esc)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-logs-page-${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1800px] px-3 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-sm font-semibold text-gray-800 mb-2">Admin • All Email Logs</h1>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-[11px] text-gray-600">
              {!logsEnabled ? (
                "Logs not loaded yet"
              ) : loading ? (
                "Loading..."
              ) : (
                `Showing ${showingFrom} to ${showingTo} of ${totalFiltered.toLocaleString()} filtered entries (Total: ${totalAll.toLocaleString()})`
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                onClick={exportCsv}
                disabled={!logsEnabled || loading || rows.length === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <Filter className="h-3.5 w-3.5" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <h2 className="text-xs font-semibold text-gray-700">Filters & Controls</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Users */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Users</label>

                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={allUsers}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAllUsers(checked);
                          setPage(1);

                          if (checked) {
                            setSelectedUserIds([]);
                            setLogsEnabled(true);
                          } else {
                            disableLogsAndClear();
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      All Users (fetch all logs)
                    </label>

                    {!allUsers && selectedUserIds.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedUserIds([]);
                          disableLogsAndClear();
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Clear Selected ({selectedUserIds.length})
                      </button>
                    )}
                  </div>

                  {!allUsers && (
                    <>
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          value={userSearchUi}
                          onChange={(e) => setUserSearchUi(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Search users..."
                        />
                      </div>

                      <div className="border border-gray-200 rounded max-h-40 overflow-y-auto">
                        {usersLoading ? (
                          <div className="p-2 text-center text-[11px] text-gray-500">Loading users...</div>
                        ) : usersError ? (
                          <div className="p-2 text-center text-[11px] text-red-600">{usersError}</div>
                        ) : users.length === 0 ? (
                          <div className="p-2 text-center text-[11px] text-gray-500">No users found</div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {users.map((u) => {
                              const checked = selectedUserIds.includes(u.id);
                              const name =
                                `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || `User #${u.id}`;
                              return (
                                <label
                                  key={u.id}
                                  className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      toggleUser(u.id);
                                      setPage(1);
                                      setLogsEnabled(true);
                                    }}
                                    className="rounded border-gray-300 text-blue-600"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs text-gray-800 truncate">
                                      <span className="font-semibold">#{u.id}</span> {name}
                                    </div>
                                    {u.email && <div className="text-[11px] text-gray-500 truncate">{u.email}</div>}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {users.length > 0 && (
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600">
                          <div>
                            Page <span className="font-semibold">{usersPage}</span> /{" "}
                            <span className="font-semibold">{usersLastPage}</span> • Total{" "}
                            <span className="font-semibold">{usersTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setUsersPage(1)}
                              disabled={usersPage <= 1}
                              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              <ChevronsLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                              disabled={usersPage <= 1}
                              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setUsersPage((p) => Math.min(usersLastPage, p + 1))}
                              disabled={usersPage >= usersLastPage}
                              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setUsersPage(usersLastPage)}
                              disabled={usersPage >= usersLastPage}
                              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              <ChevronsRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Date & Category */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500">
                          <Calendar className="h-3 w-3" /> From
                        </div>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500">
                          <Calendar className="h-3 w-3" /> To
                        </div>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Log Category</label>
                    <select
                      value={logCat}
                      onChange={(e) => {
                        setLogCat(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="delivered">Delivered</option>
                      <option value="soft_bounce">Soft Bounce</option>
                      <option value="hard_bounce">Hard Bounce</option>
                      <option value="bounce">All Bounces</option>
                    </select>
                  </div>
                </div>

                {/* Search + perPage */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Search All</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      value={searchUi}
                      onChange={(e) => setSearchUi(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search logs..."
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-gray-500">Search is debounced (400ms).</div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-700">Show</span>
                      <select
                        value={perPage}
                        onChange={(e) => {
                          setPerPage(Number(e.target.value));
                          setPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {[10, 25, 50, 100, 200].map((n,) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-gray-700">entries</span>
                    </div>

                    <button
                      onClick={() => {
                        setLogCat("");
                        setFromDate("");
                        setToDate("");
                        setSearchUi("");

                        setAllUsers(false);
                        setSelectedUserIds([]);
                        setUsersPage(1);
                        setUserSearchUi("");

                        disableLogsAndClear();
                      }}
                      className="px-3 py-1.5 text-xs text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1800px] w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  {[
                    "id",
                    "vmtaPool",
                    "orig",
                    "rcpt",
                    "timeLogged",
                    "queue",
                    "bounce",
                    "dsnStatus",
                    "dsnDiag",
                    "header_Message_Id",
                    "header_Subject",
                    "header_X_UC",
                    "dlvSourceIp",
                    "dlvType",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    View
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {!logsEnabled ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-600 font-medium">Logs are not loaded</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Click <b>All Users</b> or select user(s) to fetch logs
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-xs text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No logs found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting date or search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r,i) => {
                    const s = statusBadge(r.bounce);
                    const Icon = s.icon;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{r.id}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{r.vmtaPool}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="max-w-[260px] truncate">{r.orig}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="max-w-[260px] truncate">{r.rcpt}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-gray-500" />
                            {r.timeLogged}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="max-w-[220px] truncate">{r.queue}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${s.color}`}>
                            <Icon className="h-3 w-3" />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{r.dsnStatus}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{r.dsnDiag}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="max-w-[220px] truncate">{String(r.header_Message_Id ?? "")}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="max-w-[280px] truncate">{String(r.header_Subject ?? "")}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                          <div className="max-w-[160px] truncate">{String(r.header_X_UC ?? "")}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{r.dlvSourceIp}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{r.dlvType}</td>

                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => {
                              setViewRow(r);
                              setViewOpen(true);
                            }}
                            className="inline-flex items-center justify-center p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-600">
                Page <span className="font-semibold">{page}</span> / <span className="font-semibold">{lastPage}</span> • Filtered:{" "}
                {totalFiltered.toLocaleString()} • Total: {totalAll.toLocaleString()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={!canPrev}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                  First
                </button>

                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrev}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>

                <div className="px-3 text-xs font-medium text-gray-700">
                  Page {page} / {lastPage}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={!canNext}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setPage(lastPage)}
                  disabled={!canNext}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Last
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {viewOpen && viewRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setViewOpen(false);
              setViewRow(null);
            }
          }}
        >
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="text-sm font-semibold text-gray-800">Log Details</div>
              <button
                onClick={() => {
                  setViewOpen(false);
                  setViewRow(null);
                }}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {Object.entries(viewRow).map(([k, v]) => (
                  <div key={k} className="rounded border border-gray-200 p-3">
                    <div className="text-[11px] text-gray-500 mb-1">{k}</div>
                    <div className="font-medium text-gray-900 break-words">{String(v ?? "")}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setViewOpen(false);
                    setViewRow(null);
                  }}
                  className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
