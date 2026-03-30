"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { showToast } from "../../common/toastHelper";

/* =======================
   CONFIG: Put your APIs here
======================= */

const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

const getAuthHeaders = () => {
  const t = token();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(t ? { authorization: `Bearer ${t}` } : {}),
  };
};

/* =======================
   Types
======================= */
type ClientOption = {
  id: string | number;
  email?: string | null;
  mobile?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

type SpamReport = {
  id: string | number;
  email: string;
  title: string;
  content: string;
};

const pageSizeOptions = [10, 25, 50, 100];

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
}) {
  const items: (number | "...")[] = [];
  const maxFront = Math.min(5, pageCount);

  for (let i = 1; i <= maxFront; i++) items.push(i);
  if (pageCount > 6) items.push("...");
  if (pageCount > 5) items.push(pageCount);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        Previous
      </button>

      <div className="flex items-center gap-2">
        {items.map((item, idx) =>
          item === "..." ? (
            <span key={`dots-${idx}`} className="text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item as number)}
              className={`h-9 w-9 rounded border ${
                item === page
                  ? "border-gray-500 bg-gray-100 font-semibold"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="text-gray-700 hover:text-gray-900 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function ClientSkeletonItem() {
  return (
    <div className="border-b border-gray-100 px-4 py-3 last:border-b-0">
      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function ClientDropdownSkeleton() {
  return (
    <div className="py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <ClientSkeletonItem key={i} />
      ))}
    </div>
  );
}

export default function ClientSpamReportPage() {
  // form
  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // clients list
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // client dropdown
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientQ, setDebouncedClientQ] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [clientPerPage] = useState(10);
  const [clientLastPage, setClientLastPage] = useState(1);
  const clientDropdownRef = useRef<HTMLDivElement | null>(null);

  // reports list
  const [reports, setReports] = useState<SpamReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // ui
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  /* =======================
     Helpers: normalize API shapes
  ======================= */

  const clientLabel = (c: ClientOption) => {
    const fullName =
      c.first_name || c.last_name
        ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
        : (c.name ?? "").trim();

    const email = c.email ?? "";
    const mobile = c.mobile ?? "";

    const main = fullName || email || mobile || `Client #${c.id}`;
    const tailParts = [];
    if (email && main !== email) tailParts.push(email);
    if (mobile) tailParts.push(mobile);

    return tailParts.length ? `${main} (${tailParts.join(" / ")})` : main;
  };

  const selectedClient = useMemo(() => {
    return clients.find((c) => String(c.id) === String(clientId)) || null;
  }, [clients, clientId]);

  /* =======================
     API 1: Load clients
  ======================= */
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const qs = new URLSearchParams();
      if (debouncedClientQ.trim()) qs.set("q", debouncedClientQ.trim());
      qs.set("page", String(clientPage));
      qs.set("per_page", String(clientPerPage));

      const res = await fetch(
        `/api/email-account-setting/email-configuration/getUser?${qs.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Clients API error:", data);
        setClients([]);
        setClientLastPage(1);
        return;
      }

      const finalData = data?.data?.data?.data || [];
      const meta = data?.data?.data || {};

      setClients(Array.isArray(finalData) ? finalData : []);
      setClientLastPage(Number(meta?.last_page ?? 1));
    } catch (e: any) {
      console.error("Clients fetch failed:", e?.message || e);
      setClients([]);
      setClientLastPage(1);
    } finally {
      setLoadingClients(false);
    }
  };

  /* =======================
     API 3: Load all spam reports
  ======================= */
  const fetchAllSpamReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/user-management/client-spam-reports/viewSpamReports`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Spam list API error:", data);
        return;
      }

      const normalizeReport = data?.data?.data?.data || [];
      setReports(normalizeReport);
    } catch (e: any) {
      console.error("Spam list fetch failed:", e?.message || e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchAllSpamReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPage, debouncedClientQ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientQ(clientSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    setClientPage(1);
  }, [debouncedClientQ]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!clientDropdownRef.current) return;
      if (!clientDropdownRef.current.contains(e.target as Node)) {
        setClientOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* =======================
     API 2: POST spam report
  ======================= */
  const handleSend = async () => {
    if (!clientId || !title.trim() || !message.trim()) {
      alert("Please fill: Client, Title, and Message.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        user_id: clientId,
        title: title.trim(),
        content: message.trim(),
      };

      const res = await fetch(`/api/user-management/client-spam-reports/sendSpamReport`, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(" & ") : "Failed to send spam report");
        showToast("error", `${msg}`);
        return;
      }

      showToast("success", `${data?.message}`);
      setTitle("");
      setMessage("");
      setClientId("");
      setClientSearch("");
      setClientOpen(false);

      fetchAllSpamReports();
    } catch (e: any) {
      alert(e?.message || "Network error");
    } finally {
      setSending(false);
    }
  };

  /* =======================
     Filtering + pagination (frontend)
  ======================= */
  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;

    return reports.filter((r) => {
      return (
        r.email.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  const pageCount = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  const pagedReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);

  const handelDelete = async (id: string | number) => {
    if (!id) return;

    try {
      const res = await fetch(`/api/user-management/client-spam-reports/deleteSpamReport?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", data?.message || "Delete failed");
        return;
      }

      showToast("success", data?.message || "Deleted successfully");
      setReports((prev) => prev.filter((r) => String(r.id) !== String(id)));
    } catch (error: any) {
      showToast("error", error?.message || "Network error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Add Spam Report Form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-visible mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Clients Spam Report</h1>
          </div>

          <div className="p-6 overflow-visible">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-visible">
                <div className="relative">
                  <label className="text-sm font-semibold text-gray-800">Select Client *</label>

                  <div className="mt-2 relative" ref={clientDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setClientOpen((p) => !p)}
                      disabled={loadingClients}
                      className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 text-left outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <span className={selectedClient ? "text-gray-900" : "text-gray-500"}>
                        {selectedClient ? clientLabel(selectedClient) : "Select Username (Email/Mobile)"}
                      </span>

                      <div className="ml-3 shrink-0">
                        {loadingClients ? (
                          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                        ) : (
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform ${
                              clientOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {clientOpen && (
                      <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]">
                        {/* Search */}
                        <div className="border-b border-gray-100 bg-white p-3">
                          <div className="relative">
                            <input
                              type="text"
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="w-full rounded-xl border border-gray-300 pl-10 pr-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              placeholder="Search client"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[260px] overflow-y-auto bg-white">
                          {loadingClients ? (
                            <ClientDropdownSkeleton />
                          ) : clients.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-gray-500">
                              No clients found
                            </div>
                          ) : (
                            clients.map((c) => (
                              <button
                                key={String(c.id)}
                                type="button"
                                onClick={() => {
                                  setClientId(String(c.id));
                                  setClientOpen(false);
                                }}
                                className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 ${
                                  String(clientId) === String(c.id)
                                    ? "bg-blue-50"
                                    : "bg-white hover:bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`truncate text-sm font-semibold ${
                                    String(clientId) === String(c.id) ? "text-blue-700" : "text-gray-800"
                                  }`}
                                >
                                  {clientLabel(c)}
                                </div>

                                {c.email ? (
                                  <div className="mt-1 truncate text-xs text-gray-500">{c.email}</div>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                            disabled={clientPage === 1 || loadingClients}
                            className="inline-flex min-w-[84px] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                          </button>

                          <span className="text-xs font-medium text-gray-600">
                            Page <span className="text-gray-900">{clientPage}</span> / {clientLastPage}
                          </span>

                          <button
                            type="button"
                            onClick={() => setClientPage((p) => Math.min(clientLastPage, p + 1))}
                            disabled={clientPage === clientLastPage || loadingClients}
                            className="inline-flex min-w-[84px] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 w-full p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter title"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-semibold text-gray-800">Content *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 w-full p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter message"
                />
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </div>

        {/* Spam Reports List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Spam Report List</h1>
            <button
              onClick={fetchAllSpamReports}
              className="text-sm px-3 py-2 rounded border bg-white hover:bg-gray-50"
              disabled={loadingReports}
            >
              {loadingReports ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Search & Show Controls */}
          <div className="px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-lg font-semibold">entries</span>

              {loadingReports && (
                <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-lg font-semibold">Search:</label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded border"
                  placeholder="Search"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Content</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>

              <tbody>
                {!loadingReports && pagedReports.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-600" colSpan={4}>
                      No spam reports found.
                    </td>
                  </tr>
                ) : (
                  pagedReports.map((report) => (
                    <tr key={String(report.id)} className="border-b">
                      <td className="px-6 py-4 text-sm text-gray-900">{report.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{report.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{report.content}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handelDelete(report.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">
                {filteredReports.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(page * pageSize, filteredReports.length)}
              </span>{" "}
              of <span className="font-semibold">{filteredReports.length}</span> entries
            </div>

            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}