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

  plan_start_date?: string | null;
  plan_end_date?: string | null;
  extra_email_end_date?: string | null;
  final_validity_date?: string | null;
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
};

function formatDateForDisplay(input?: string | null) {
  if (!input) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [year, month, day] = input.slice(0, 10).split("-");
    return `${day}-${month}-${year}`;
  }
  return input;
}

function formatValidityRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "-";
  if (start && end) {
    return `${formatDateForDisplay(start)} to ${formatDateForDisplay(end)}`;
  }
  return formatDateForDisplay(end || start);
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

  // ✅ now backend sorting
  const [dateSortOrder, setDateSortOrder] = useState<SortOrder>("desc");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, dateSortOrder, perPage]);

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
      qs.set("sort_by", "registered");
      qs.set("sort_order", dateSortOrder);
      console.log("sort_by =", "registered");
      console.log("sort_order =", dateSortOrder);
      console.log("page =", page);

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

        const validityEnd = u.extra_email_end_date || u.final_validity_date || u.plan_end_date || u.validity_date || null;
        const validityRange = formatValidityRange(u.plan_start_date, validityEnd);

        return {
          id: u.id,
          name: fullName || u.email,
          email: u.email,
          registered: formatDateForDisplay(u.date_time || u.created_at || u.registered_at || null),
          validity: validityRange,
          status: normalizeStatus(u.status),
          emailVerified: Boolean(u.is_email_varified),
          mobileVerified: Boolean(u.is_mobile_verify),
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
  }, [page, perPage, debouncedQ, dateSortOrder]);

  const pages = useMemo(() => buildPages(page, lastPage), [page, lastPage]);

  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setPage((p) => Math.min(lastPage, p + 1));
  }

  function handleEdit(userId: number) {
    router.push(`list-users/edit/${userId}`);
  }

  function handleAdd(userId: number) {
    router.push(`list-users/add_user_package/${userId}`);
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
      const newTabUrl = `${window.location.origin}${targetPath}?session=${encodedData}`;
      window.open(newTabUrl, "_blank");
    } catch (error: any) {
      setErrorMessage(error.message || "Superlogin failed");
    } finally {
      setSuperLoginUserId(null);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Search, sort and paginate from server
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

      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p>{errorMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300" />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registered</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Validity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Verify</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile Verify</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
                      <p className="text-sm font-medium text-gray-700">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p className="text-sm text-gray-500">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user.id} className="hover:bg-orange-50/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200 flex items-center justify-center">
                          <span className="text-sm font-bold text-orange-700">
                            {(user.name?.[0] ?? "U").toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 truncate">{user.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 whitespace-nowrap">{user.registered}</span>
                    </td>

                    <td className="px-6 py-4">
                      {user.validity === "-" ? (
                        <span className="text-sm text-red-400 whitespace-nowrap ">No current plane</span>
                      ) : (
                        <span className="text-sm text-green-700 whitespace-nowrap">
                          {user.validity}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.emailVerified 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {user.emailVerified ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.mobileVerified 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {user.mobileVerified ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {user.mobileVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          user.status === "Active" ? "bg-green-500" : "bg-gray-400"
                        }`} />
                        {user.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdd(user.id)}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          title="Add Package"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleEdit(user.id)}
                          className="p-1.5 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors"
                          title="Edit User"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleSettings(user.id)}
                          disabled={superLoginUserId === user.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            superLoginUserId === user.id
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-purple-600 hover:bg-purple-50"
                          }`}
                          title="Super Login"
                        >
                          {superLoginUserId === user.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
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
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{from}</span> to{" "}
              <span className="font-semibold text-gray-900">{to}</span> of{" "}
              <span className="font-semibold text-gray-900">{total}</span> results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={goPrev}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {pages.map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${
                        p === page
                          ? "bg-orange-500 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={goNext}
                disabled={page === lastPage}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setPage(lastPage)}
                disabled={page === lastPage}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}