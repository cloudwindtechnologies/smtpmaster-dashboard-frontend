"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const PAGE_SIZE = 30;

type DomainDetails = {
  id: number;
  domain_name: string;
  spf_is_valid: "0" | "1" | 0 | 1 | boolean;
  dkim_is_valid: "0" | "1" | 0 | 1 | boolean;
  dmarc_is_valid: "0" | "1" | 0 | 1 | boolean;
  email: string;
  user_id: number;
};

function isValidFlag(value: any): boolean {
  return value === 1 || value === "1" || value === true;
}

function StatusBadge({ isValid }: { isValid: boolean }) {
  return (
    <span
      className={
        "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold text-white " +
        (isValid ? "bg-green-600" : "bg-red-600")
      }
    >
      {isValid ? "Valid" : "Invalid"}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <h2 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

export default function ListAllAssignDomainsPage() {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);

  // ✅ Store full table here
  const [allRecords, setAllRecords] = useState<DomainDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function fetchAllDomains() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("token");

      // ✅ call your API (it returns allData)
      const response = await fetch(`/api/email-account-setting/list-sender-domain`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      const apiResponse = await response.json().catch(() => ({}));

      // ✅ extract allData safely
      const allList: DomainDetails[] =
        apiResponse?.data?.allData ??
        apiResponse?.allData ??
        [];
      console.log(apiResponse);
      
      const safeAll = Array.isArray(allList) ? allList : [];
      toast.success(`${apiResponse.message}`,{position:"top-center",style:{border:'3px solid blue',}})
      setAllRecords(safeAll);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error(`${err}`,{style:{border:'3px solid red',}})
      setErrorMessage("Failed to load domains list.");
      setAllRecords([]);
    } finally {
      
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAllDomains();
  }, []);

  // ✅ Search across FULL table (allRecords)
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRecords;

    return allRecords.filter((record) => {
      const email = record?.email?.toLowerCase?.() ?? "";
      const domain = record?.domain_name?.toLowerCase?.() ?? "";
      return email.includes(q) || domain.includes(q);
    });
  }, [allRecords, searchQuery]);

  // ✅ when searching, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ✅ Local pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const pageRecords = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, safePage]);

  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const paginationButtons = useMemo(() => {
    const buttons: (number | "...")[] = [];
    const windowSize = 2;

    buttons.push(1);

    const start = Math.max(2, safePage - windowSize);
    const end = Math.min(totalPages - 1, safePage + windowSize);

    if (start > 2) buttons.push("...");

    for (let i = start; i <= end; i++) buttons.push(i);

    if (end < totalPages - 1) buttons.push("...");

    if (totalPages > 1) buttons.push(totalPages);

    // remove duplicates
    return buttons.filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
  }, [safePage, totalPages]);

  function handleEdit(record: DomainDetails) {
    router.push(`/email-account-setting/list-sender-domain/edit-domain/${record?.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <Card title="List All Assign Domains">
          {/* Top Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm font-semibold text-gray-800">
              Page: <span className="font-bold">{safePage}</span>
              <span className="text-gray-500"> / {totalPages}</span>
              <span className="text-gray-500"> • Total: {allRecords.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Search:</span>
              <div className="relative w-full sm:w-72">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded border border-gray-400 bg-white px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by email or domain..."
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 sm:px-5 py-4 text-left font-semibold text-gray-900">Email</th>
                    <th className="px-4 sm:px-5 py-4 text-left font-semibold text-gray-900">Domain</th>
                    <th className="px-4 sm:px-5 py-4 text-center font-semibold text-gray-900">SPF</th>
                    <th className="px-4 sm:px-5 py-4 text-center font-semibold text-gray-900">DKIM</th>
                    <th className="px-4 sm:px-5 py-4 text-center font-semibold text-gray-900">DMARC</th>
                    <th className="px-4 sm:px-5 py-4 text-center font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <div className="flex items-center justify-center gap-2 text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : pageRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    pageRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100">
                        <td className="px-4 sm:px-5 py-4 whitespace-nowrap text-gray-800">
                          {record?.email}
                        </td>
                        <td className="px-4 sm:px-5 py-4 whitespace-nowrap text-gray-800">
                          {record?.domain_name}
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-center">
                          <StatusBadge isValid={isValidFlag(record?.spf_is_valid)} />
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-center">
                          <StatusBadge isValid={isValidFlag(record?.dkim_is_valid)} />
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-center">
                          <StatusBadge isValid={isValidFlag(record?.dmarc_is_valid)} />
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-700"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer + Pagination */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-700">
            <div>
              Showing <b>{pageRecords.length}</b> records • Filtered:{" "}
              <b>{filteredRecords.length}</b> • Total: <b>{allRecords.length}</b>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                disabled={!hasPrev || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 text-gray-500 disabled:opacity-50"
              >
                Previous
              </button>

              {paginationButtons.map((item, index) =>
                item === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCurrentPage(item)}
                    className={
                      "h-7 min-w-7 rounded border px-2 " +
                      (item === safePage
                        ? "border-gray-800 bg-gray-100 text-gray-900"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
                    }
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={!hasNext || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2 py-1 text-gray-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
