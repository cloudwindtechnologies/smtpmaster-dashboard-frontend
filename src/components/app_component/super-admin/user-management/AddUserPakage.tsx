"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Plus, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { token } from "../../common/http";

/* =========================================================
   Auth headers
========================================================= */
const getAuthHeaders = () => ({
  Accept: "application/json",
  Authorization: `Bearer ${token()}`,
});

/* =========================================================
   Small helpers
========================================================= */
const toBool = (v: any) => v === true || v === 1 || v === "1" || v === "true";

const showToast = (type: "success" | "error" | "info", msg: string) => {
  const base = { borderRadius: "10px", fontWeight: 600 as const };
  if (type === "success")
    return toast.success(msg, {
      position: "top-center",
      style: { ...base, border: "3px solid #16a34a", background: "#ecfdf5", color: "#065f46" },
    });
  if (type === "error")
    return toast.error(msg, {
      position: "top-right",
      style: { ...base, border: "3px solid #dc2626", background: "#fef2f2", color: "#7f1d1d" },
    });
  return toast(msg, {
    position: "bottom-center",
    style: { ...base, border: "3px solid #f59e0b", background: "#fffbeb", color: "#92400e" },
  });
};

/* =========================================================
   Types
========================================================= */
type PackageOption = {
  id: number;
  name: string;
};

type UserInfo = {
  name: string;
  email: string;
  mobile: string;
};

type UserPackageRow = {
  id: number; // row id (assigned package id)
  packageName: string;

  startDate?: string | null;
  endDate?: string | null;

  addedBy?: string | null;

  extraEmail?: string | null;
  extraStartDate?: string | null;
  extraEndDate?: string | null;
};

export default function UserPackagesPage() {
  const params = useParams<{ id?: string; userId?: string }>();
  const userId = params?.userId ?? params?.id ?? ""; // supports /[id] or /[userId]

  /* =========================================================
     State (keep simple)
  ========================================================= */
  const [user, setUser] = useState<UserInfo>({
    name: "—",
    email: "—",
    mobile: "—",
  });

  // dropdown packages
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  
  // form
  const [startDate, setStartDate] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");

  
  // table
  const [rows, setRows] = useState<UserPackageRow[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // search + pagination
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // actions
  const [busyId, setBusyId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
    /* =========================================================
     1) GET single user  (dropdown)
  ========================================================= */
  const fetchSingleUser=async()=>{
    try {
        const res = await fetch(`/api/user-management/list-users/add-packages/get_single_user?id=${userId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token()}`,
          },
          cache: "no-store",
        });
      const data=await res.json().catch(()=>({}))
      console.log(data);
      
      const u=data.data;
      if (u) {
        setUser({
          name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
          email: String(u.email ?? "—"),
          mobile: String(u.mobile ?? ''),
        });
      }
      console.log('data',data.data);
      
    
    } catch (error) {
      console.log(error);
      
    }
  }
  useEffect(()=>{fetchSingleUser()},[])

  /* =========================================================
     1) GET packages (dropdown)
  ========================================================= */
  const fetchPackageOptions = async () => {

    setLoadingPackages(true);
    try {
      const res = await fetch(`/api/email-pakage-config/get-all-pakages`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data?.message || "Failed to load packages");
        return;
      }

      // ✅ adjust mapping to your API shape
      const list = (data?.data ?? data?.packages ?? []) as any[];
      const mapped: PackageOption[] = list.map((p) => ({
        id: Number(p.id),
        name: String(p.package_name ?? p.name ?? p.title ?? ""),
      }));

      setPackageOptions(mapped);
    } catch (e: any) {
      showToast("error", e?.message || "Network error");
    } finally {
      setLoadingPackages(false);
    }
  };

  /* =========================================================
     3) GET all user packages (table)
     - also tries to fill user header if API returns it
  ========================================================= */
  const fetchUserPackages = async () => {
    if (!userId) {
      showToast("error", "Missing userId in route");
      return;
    }

    setLoadingTable(true);
    try {
        const res = await fetch(
          `/api/user-management/list-users/add-packages/get_all_packages?userId=${userId}`,
          {
            method: "GET",
            headers: {authorization:`Bearer ${token()}`},
            cache: "no-store",
          }
        );

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        showToast("error", data?.message || "Failed to load user packages");
        return;
      }

      
      // ✅ if your API returns user info
      const u = data ?? data?.user_info ?? data?.data?.user;

      const list = (data?.data ?? data?.packages ?? data?.user_packages ?? []) as any[];
      const mapped: UserPackageRow[] = list.map((r) => ({
        id: Number(r.id),
        packageName: String(r.package_name ?? r.package?.package_name ?? r.packageName ?? r.name ?? ""),
        startDate: r.start_date ?? r.startDate ?? null,
        endDate: r.end_date ?? r.endDate ?? null,
        addedBy: r.first_name ?? null,
        extraEmail: r.extra_email ?? null,
        extraStartDate: r.extra_email_start_date ?? null,
        extraEndDate: r.extra_email_end_date ?? null,
      }));

      setRows(mapped);
      setPage(1);
      showToast("success", "Data fetched successfully");
    } catch (e: any) {
      showToast("error", e?.message || "Network error");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchPackageOptions();
    fetchUserPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* =========================================================
     2) POST add package to user
  ========================================================= */
  const onAddPackage = async () => {
    if (!userId) {
      showToast("error", "Missing userId");
      return;
    }
    if (!startDate) {
      showToast("error", "Please select Start Date");
      return;
    }
    if (!selectedPackageId) {
      showToast("error", "Please select a Package");
      return;
    }

    setAdding(true);
    try {
      const payload = {
        start_date: startDate,
        plan_id: Number(selectedPackageId),
      };

        const res = await fetch(`/api/user-management/list-users/add-packages?id=${userId}`, {
          method: "POST",
          headers: { authorization:`Bearer ${token()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ start_date: startDate, plan_id: Number(selectedPackageId) }),
        });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data?.message || "Failed to add package");
        return;
      }

      showToast("success", data?.message || "Package added");
      setStartDate("");
      setSelectedPackageId("");
      await fetchUserPackages();
    } catch (e: any) {
      showToast("error", e?.message || "Network error");
    } finally {
      setAdding(false);
    }
  };

  /* =========================================================
     4) DELETE user package row
  ========================================================= */
  const onDeleteRow = async (rowId: number) => {

    setBusyId(rowId);
    try {
      const res = await fetch(`/api/user-management/list-users/add-packages/deletePackage?rowId=${rowId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data?.message || "Delete failed");
        return;
      }

      showToast("success", data?.message || "Deleted");
      await fetchUserPackages();
    } catch (e: any) {
      showToast("error", e?.message || "Network error");
    } finally {
      setBusyId(null);
    }
  };

  /* =========================================================
     5) POST action button (+) on row
     (example: add extra email / extend package etc.)
  ========================================================= */
  const route=useRouter()
  const onPlusAction = async (rowId: number) => {
      route.push(`add_extra_package/${rowId}`)
  };

  /* =========================================================
     Search + Pagination (client-side)
  ========================================================= */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.packageName,
        r.startDate,
        r.endDate,
        r.addedBy,
        r.extraEmail,
        r.extraStartDate,
        r.extraEndDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header (User) */}
        <div className="border border-gray-200 rounded-md bg-white">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-medium text-gray-800">{user.name}</h1>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <div>Email : {user.email}</div>
              <div className={user.mobile ? "text-black" : "text-red-500"}>
                Mobile : {user.mobile?.trim() ? user.mobile : "Mobile number not set"}
              </div>

            </div>
          </div>
        </div>

        {/* Add User Package */}
        <div className="mt-4 border border-gray-200 rounded-md bg-white">
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700">
            Add User Package
          </div>

          <div className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Package */}
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">package</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  disabled={loadingPackages}
                >
                  <option value="">{loadingPackages ? "Loading..." : "Select package"}</option>
                  {packageOptions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Button (right like screenshot) */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onAddPackage}
                  disabled={adding}
                  className={[
                    "rounded-sm bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700",
                    adding ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {adding ? "Adding..." : "Add Package"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* All Packages table */}
        <div className="mt-6 border border-gray-200 rounded-md bg-white">
          <div className="px-4 py-3">
            <h2 className="text-lg font-medium text-gray-800">All Packages</h2>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* show entries */}
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-sm border border-gray-300 bg-white px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>

              {/* search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search:"
                    className="w-72 rounded-sm border border-gray-300 px-3 py-2 pr-9 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchUserPackages}
                  className="rounded-sm border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-gray-200">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Packages Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Start Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">End Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Added By</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Extra Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Extra Start Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Extra End Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Action</th>
                </tr>
              </thead>

              <tbody>
                {loadingTable ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="px-3 py-2">{r.packageName}</td>
                      <td className="px-3 py-2">{r.startDate ?? "—"}</td>
                      <td className="px-3 py-2">{r.endDate ?? "—"}</td>
                      <td className="px-3 py-2">{r.addedBy ?? "—"}</td>
                      <td className="px-3 py-2">{r.extraEmail ?? "—"}</td>
                      <td className="px-3 py-2">{r.extraStartDate ?? "—"}</td>
                      <td className="px-3 py-2">{r.extraEndDate ?? "—"}</td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onDeleteRow(r.id)}
                            disabled={busyId === r.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPlusAction(r.id)}
                            disabled={busyId === r.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            title="Action"
                          >
                            <Plus className="h-4 w-4 text-green-600" />
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
          <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-600">
            <div>
              Showing {filtered.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} entries
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-sm border border-gray-300 px-3 py-2 disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>

              <div className="rounded-sm border border-gray-300 px-3 py-2 bg-white">
                {page}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-sm border border-gray-300 px-3 py-2 disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-3 text-[11px] text-gray-500">
          Tip: Your APIs can return different field names — adjust the mapping in
          <span className="font-semibold"> fetchPackageOptions()</span> and{" "}
          <span className="font-semibold">fetchUserPackages()</span>.
        </div>
      </div>
    </div>
  );
}
