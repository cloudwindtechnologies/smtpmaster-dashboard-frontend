"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Mail,
  UserPlus,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  RefreshCw,
  PencilIcon,
  ChevronsLeft,
  ChevronsRight,
  SquareArrowRightIcon,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

type ApiUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
 
  registered_at?: string | null;
  validity_date?: string | null;
  created_at?: string | null;
  date_time?: string | null;
  status?: "Active" | "Inactive" | string | number | boolean | null;
  is_mobile_verify?: boolean | null;
  is_email_varified?: boolean | null;
};

type UserStatus = "Active" | "Inactive";
type SortOrder = "desc" | "asc";

type UserRow = {
  id: number;
  name: string;
  email: string;
  registered: string;
  validity: string;
  status: UserStatus;
  emailVerified: boolean;
  mobileVerified: boolean;
  sortDateRaw: string | null;
};

function formatDateForDisplay(input?: string | null) {
  if (!input) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [year, month, day] = input.slice(0, 10).split("-");
    return `${day}-${month}-${year}`;
  }
  return input;
}

function normalizeStatus(value: ApiUser["status"]): UserStatus {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "inactive" || text === "0" || text === "false") return "Inactive";
  if (text === "active" || text === "1" || text === "true") return "Active";
  return "Active";
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        status === "Active"
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-gray-100 text-gray-700 border border-gray-200",
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 inline-block h-2 w-2 rounded-full",
          status === "Active" ? "bg-green-500" : "bg-gray-400",
        ].join(" ")}
      />
      {status}
    </span>
  );
}

function ValidityPill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-pink-600 px-3 py-1 text-xs font-semibold text-white">
      {value}
    </span>
  );
}

function VerifyBadge({
  value,
  yesLabel = "Verified",
  noLabel = "Not Verified",
}: {
  value: boolean;
  yesLabel?: string;
  noLabel?: string;
}) {
  return value ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {yesLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
      <XCircle className="h-3.5 w-3.5" />
      {noLabel}
    </span>
  );
}

function buildPages(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];
  const windowSize = 3;

  pages.push(1);

  const start = Math.max(2, current - windowSize);
  const end = Math.min(total - 1, current + windowSize);

  if (start > 2) pages.push("...");

  for (let p = start; p <= end; p++) pages.push(p);

  if (end < total - 1) pages.push("...");

  pages.push(total);

  return pages;
}

export default function UsersListTable() {
  const router = useRouter();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [superLoginUserId, setSuperLoginUserId] = useState<number | null>(null);

  // ✅ date sorting state
  const [dateSortOrder, setDateSortOrder] = useState<SortOrder>("desc");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  async function fetchUsers() {
    const storedToken = localStorage.getItem("token");

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const qs = new URLSearchParams();
      if (debouncedQ?.trim()) qs.set("q", debouncedQ.trim());
      qs.set("page", String(page));
      qs.set("per_page", String(perPage));

      const response = await fetch(
        `/api/email-account-setting/email-configuration/getUser?${qs.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${storedToken ?? ""}` },
          cache: "no-store",
          signal: abortRef.current.signal,
        }
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.message ?? "Failed to load users");

      const usersFromApi: ApiUser[] = json?.data?.data?.data ?? [];
      const meta = json?.data?.data ?? {};

      const mapped: UserRow[] = usersFromApi.map((u) => {
        const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
        const rawDate = u.date_time || u.created_at || u.registered_at || null;

        return {
          id: u.id,
          name: fullName || u.email,
          email: u.email,
          registered: formatDateForDisplay(rawDate),
          validity: u.validity_date ? formatDateForDisplay(u.validity_date) : "-",
          status: normalizeStatus(u.status),
          emailVerified: Boolean(u.is_email_varified),
          mobileVerified: Boolean(u.is_mobile_verify),
          sortDateRaw: rawDate,
        };
      });

      setRows(mapped);

      setTotal(Number(meta.total ?? 0));
      setLastPage(Number(meta.last_page ?? 1));
      setFrom(Number(meta.from ?? 0));
      setTo(Number(meta.to ?? 0));

    const lp = Number(meta.last_page ?? 1);
    if (page > lp && lp !== page) {
      setPage(lp);
    }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setRows([]);
      setTotal(0);
      setLastPage(1);
      setFrom(0);
      setTo(0);
      setErrorMessage(err?.message ?? "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debouncedQ]);

  const pages = useMemo(() => buildPages(page, lastPage), [page, lastPage]);

  // ✅ client-side date sorting for current loaded page
  const sortedRows = useMemo(() => {
    const cloned = [...rows];

    cloned.sort((a, b) => {
      const aTime = a.sortDateRaw ? new Date(a.sortDateRaw).getTime() : 0;
      const bTime = b.sortDateRaw ? new Date(b.sortDateRaw).getTime() : 0;

      return dateSortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return cloned;
  }, [rows, dateSortOrder]);

  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setPage((p) => Math.min(lastPage, p + 1));
  }

  function handleMail(userId: number) {
    console.log("Mail user:", userId);
  }

  function handleEdit(userId: number) {
    router.push(`list-users/edit/${userId}`);
  }

  function handleAdd(userId: number) {
    router.push(`list-users/add_user_package/${userId}`);
  }

  function handleDelete(userId: number) {
    console.log("Delete user:", userId);
  }

  const handleSettings = async (userId: number) => {
    const superadminToken = localStorage.getItem("token") || localStorage.getItem("superadmin_token");
    if (!superadminToken) {
      router.push("/login");
      return;
    }

    setSuperLoginUserId(userId);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/user-management/list-users/superlogin_frwgmerggm?userId=${userId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${superadminToken}`,
          },
        }
      );

      if (res.status === 401) {
        const errorData = await res.json();
        setErrorMessage(errorData?.error || "Unauthorized access");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Superlogin failed");
      }

      if (!data.token) {
        throw new Error("No token received from server");
      }

      localStorage.setItem("user_token", data.token);

      const sessionData = {
        type: "user",
        wheretogo: data.wheretogo || "dashboard",
        filldata: data.filldata || {},
      };

      const encodedData = btoa(JSON.stringify(sessionData));

      const routeMap: Record<string, string> = {
        statp2: "/",
        statp3: "/",
        statp4: "/",
        statp5: "/",
        statp7: "/",
        dashboard: "/",
      };

      const targetPath = routeMap[data.wheretogo || "/"] || "/";
      const newTabUrl = `http://localhost:3000${targetPath}?session=${encodedData}`;
      window.open(newTabUrl, "_blank");
    } catch (error: any) {
      setErrorMessage(error.message || "Superlogin failed");
    } finally {
      setSuperLoginUserId(null);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Search & paginate from server (fast for large data)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-[360px]">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search users by name, email..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none shadow-sm transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg bg-orange-50 p-2">
                <Search className="h-4 w-4 text-orange-600" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchUsers}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => console.log("Add User")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
            <Users className="h-4 w-4" />
            Total: <b className="text-gray-900">{total}</b>
          </span>

          <span className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
            Per page:
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="bg-transparent outline-none font-semibold text-gray-900"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </span>

          <button
            type="button"
            onClick={() => setDateSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Sort by date"
          >
            <ArrowUpDown className="h-4 w-4" />
            Date: {dateSortOrder === "desc" ? "Newest First" : "Oldest First"}
          </button>

          <span className="ml-auto text-xs text-gray-500">
            {debouncedQ ? `Searching: "${debouncedQ}"` : "No search filter"}
          </span>
        </div>
      </div>

      {/* Error */}
      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p>{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {/* Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300" />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  <div className="flex items-center gap-2">
                    <span>Name</span>
                    <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                  </div>
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Email
                </th>


                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Registered
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Validity
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Email Verify
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Mobile Verify
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
                      <p className="text-sm font-medium text-gray-700">Loading users...</p>
                      <p className="text-xs text-gray-500">Please wait a moment</p>
                    </div>
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-sm text-gray-600">
                    No users found
                  </td>
                </tr>
              ) : (
                sortedRows.map((user) => (
                  <tr key={user.id} className="group hover:bg-orange-50/40 transition">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200 text-sm font-bold text-orange-700">
                          {(user.name?.[0] ?? "U").toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                          <p className="truncate text-xs text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="rounded-lg bg-gray-100 p-2">
                          <Mail className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="truncate text-sm text-gray-900">{user.email}</span>
                      </div>
                    </td>

                  

                    <td className="px-6 py-5 text-sm text-gray-800">{user.registered}</td>

                    <td className="px-6 py-5">
                      {user.validity === "-" ? (
                        <span className="text-sm text-gray-500">-</span>
                      ) : (
                        <ValidityPill value={user.validity} />
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <VerifyBadge value={user.emailVerified} yesLabel="Verified" noLabel="Unverified" />
                    </td>

                    <td className="px-6 py-5">
                      <VerifyBadge value={user.mobileVerified} yesLabel="Verified" noLabel="Unverified" />
                    </td>

                    <td className="px-6 py-5">
                      <StatusBadge status={user.status} />
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleAdd(user.id)}
                          className="rounded-xl p-2 text-green-600 border border-green-200 bg-white shadow-sm hover:bg-green-50 transition"
                          title="Add"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(user.id)}
                          className="rounded-xl p-2 text-yellow-600 border border-yellow-200 bg-white shadow-sm hover:bg-yellow-50 transition"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSettings(user.id)}
                          disabled={superLoginUserId === user.id}
                          className={[
                            "rounded-xl p-2 border bg-white shadow-sm transition",
                            superLoginUserId === user.id
                              ? "text-purple-400 border-purple-200 cursor-not-allowed opacity-70"
                              : "text-purple-600 border-purple-200 hover:bg-purple-50",
                          ].join(" ")}
                          title="Settings (Super Login)"
                        >
                          {superLoginUserId === user.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
                            </span>
                          ) : (
                            <SquareArrowRightIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-700">
              Showing <span className="font-semibold">{from}</span> to{" "}
              <span className="font-semibold">{to}</span> of{" "}
              <span className="font-semibold">{total}</span> results
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={goPrev}
                disabled={page === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {pages.map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`dots-${idx}`}
                      className="h-10 px-3 inline-flex items-center justify-center text-sm text-gray-500"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={[
                        "h-10 w-10 rounded-xl text-sm font-semibold transition",
                        p === page
                          ? "bg-orange-500 text-white shadow-sm"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={page === lastPage}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPage(lastPage)}
                disabled={page === lastPage}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* honest note */}
      <p className="mt-4 text-xs text-gray-500">
        Date sorting here is applied to the currently loaded page. For full database-level sorting across all pages,
        your API should support sort parameters.
      </p>
    </div>
  );
}