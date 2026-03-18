"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Trash2, Loader2 } from "lucide-react";
import { showToast } from "../../common/toastHelper";

/* =======================
   CONFIG: Put your APIs here
======================= */

// If you use token auth like other pages:
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

export default function ClientSpamReportPage() {
  // form
  const [clientId, setClientId] = useState<string>("");

  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // clients list
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

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
      (c.first_name || c.last_name)
        ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
        : (c.name ?? "").trim();

    const email = c.email ?? "";
    const mobile = c.mobile ?? "";

    // Show like: name/email (mobile)
    const main = fullName || email || mobile || `Client #${c.id}`;
    const tailParts = [];
    if (email && main !== email) tailParts.push(email);
    if (mobile) tailParts.push(mobile);

    return tailParts.length ? `${main} (${tailParts.join(" / ")})` : main;
  };

  /* =======================
     API 1: Load clients
  ======================= */
  const fetchClients = async () => {

    setLoadingClients(true);
    try {
      const res = await fetch(`/api/email-account-setting/email-configuration/getUser`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Clients API error:", data);
        return;
      }
      const finalData=data?.data?.data?.data || []
      setClients(finalData);
    } catch (e: any) {
      console.error("Clients fetch failed:", e?.message || e);
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
      const normalizeReport=data?.data?.data?.data || []
      setReports(normalizeReport);
    } catch (e: any) {
      console.error("Spam list fetch failed:", e?.message || e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchAllSpamReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        user_id: clientId, // you can rename this to user_id if backend expects
        title: title.trim(),
        content: message.trim(),
      };

      const res = await fetch(`/api/user-management/client-spam-reports/sendSpamReport`, {
        method: "POST",
        headers: {
          'accept':'application/json',
          authorization:`Bearer ${token()}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(" & ") : "Failed to send spam report");
        showToast("error",`${msg}`)
        return;
      }

      
      showToast("success",`${data?.message}`)
      // reset form
      setTitle("");
      setMessage("");

      // refresh list
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
    // reset page if pageSize or filtered data changes
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Clients Spam Report</h1>
          </div>

          <div className="p-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Select Client *</label>

                  <div className="mt-2 relative">
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loadingClients}
                    >
                      <option value="">
                        {loadingClients ? "Loading clients..." : "Select Username (Email/Mobile)"}
                      </option>
                      {clients.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {clientLabel(c)}
                        </option>
                      ))}
                    </select>

                    {loadingClients && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-gray-500" />
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
                  pagedReports.map((report,i) => (
                    <tr key={String(report.id)} className="border-b">
                      <td className="px-6 py-4 text-sm text-gray-900">{report.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{report.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{report.content}</td>
                      <td className="px-6 py-4 text-sm">
                        {/* Delete API not requested, kept as UI only */}
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={()=>handelDelete(report.id)}
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
