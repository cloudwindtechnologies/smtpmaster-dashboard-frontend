"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Loader2, Eye, X } from "lucide-react";
import { token } from "../../common/http";

type ApiSpamItem = {
  id: number;
  title?: string | null;
  content?: string | null;
  message?: string | null;
  spamreport?: string | null;
  created_at?: string | null;
};

type ApiPaginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

type ApiResponse = {
  data?: ApiPaginated<ApiSpamItem>;
  success?: boolean;
  message?: string;
  code?: number;
};

type SpamRow = {
  id: number;
  title: string;
  spamreport: string; // full text
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { __raw: text };
  }
}

function truncateWords(text: string, maxWords = 20) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const words = clean.split(" ");
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(" ") + "…";
}

export default function SpamReport() {
  const [rows, setRows] = useState<SpamRow[]>([]);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [activeRow, setActiveRow] = useState<SpamRow | null>(null);

  const openView = (row: SpamRow) => {
    setActiveRow(row);
    setOpenModal(true);
  };

  const closeView = () => {
    setOpenModal(false);
    setActiveRow(null);
  };

  const loadSpamReports = async (pageNo = 1) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/spam-report?page=${pageNo}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      });

      const json: ApiResponse = await safeJson(res);

      if (!res.ok) {
        throw new Error((json as any)?.message || `Request failed (${res.status})`);
      }

      const list = json?.data?.data ?? [];

      const mapped: SpamRow[] = list.map((item) => {
        const title =
          item?.title?.trim() ||
          "Abuse Reports | From IP and Sending App | Mailing Stopped";

        const full =
          item?.content?.trim() ||
          item?.spamreport?.trim() ||
          item?.message?.trim() ||
          "Please check your registered email address for more details";

        return {
          id: Number(item?.id ?? Math.random()),
          title,
          spamreport: full,
        };
      });

      setRows(mapped);

      setLastPage(Number(json?.data?.last_page ?? 1) || 1);
      setPage(Number(json?.data?.current_page ?? pageNo) || pageNo);
    } catch (e: any) {
      setRows([]);
      setError(e?.message ?? "Failed to load spam reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpamReports(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC to close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeView();
    };
    if (openModal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const x = a.title.toLowerCase();
      const y = b.title.toLowerCase();
      if (x < y) return sortAsc ? -1 : 1;
      if (x > y) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortAsc]);

  return (
    <div className="w-full bg-gray-100">
      <div className="w-full bg-white border border-gray-300 shadow-sm">
        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-4 py-3 text-left font-semibold text-gray-800 w-[35%]">
                  <button
                    type="button"
                    onClick={() => setSortAsc((s) => !s)}
                    className="inline-flex items-center gap-2"
                    aria-label="Sort by Title"
                  >
                    Title
                    <span className="text-gray-500">
                      {sortAsc ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  spamreport
                </th>

                {/* View column */}
                <th className="px-4 py-3 text-left font-semibold text-gray-800 w-[120px]">
                  View
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading spam reports...
                    </span>
                  </td>
                </tr>
              )}

              {!loading &&
                sortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-300 bg-white">
                    <td className="px-4 py-3 text-gray-800">{r.title}</td>

                    {/* ✅ show only 20 words + ... */}
                    <td className="px-4 py-3 text-gray-800">
                      {truncateWords(r.spamreport, 20)}
                    </td>

                    {/* ✅ view button */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openView(r)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                        aria-label="View spam report"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && sortedRows.length === 0 && !error && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-600">
                    No spam reports found.
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="px-4 py-3 flex items-center justify-between text-xs text-gray-500 border-t bg-white">
          <div>
            Page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{lastPage}</span>
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={loading || page <= 1}
              onClick={() => loadSpamReports(page - 1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={loading || page >= lastPage}
              onClick={() => loadSpamReports(page + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Keep your empty large area */}
        <div className="h-[520px] bg-gray-100" />

        <div className="px-4 py-2 text-xs text-gray-500">
          Copyright 2021 © SMTPMaster.com
        </div>
      </div>

      {/* ✅ Modal */}
      {openModal && (
        <div
          className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            // close on outside click
            if (e.target === e.currentTarget) closeView();
          }}
        >
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {activeRow?.title ?? "Spam Report"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Full spam report details
                </p>
              </div>

              <button
                onClick={closeView}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
                title="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-5">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-6">
                {activeRow?.spamreport ?? "No details"}
              </div>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button
                onClick={closeView}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
