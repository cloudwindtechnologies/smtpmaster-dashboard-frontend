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
    <div className="w-full" style={{ backgroundColor: "var(--page-bg)",borderRadius: "var(--page-radius)" }}>
      
      <div
        className="w-full border shadow-sm overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-card)",
          borderRadius: "var(--page-radius)"
        }}
      >
        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm ">
            <thead>
              <tr 
                className="border-b" 
                style={{ 
                  backgroundColor: "var(--surface-2)", 
                  borderColor: "var(--border)" 
                }}
              >
                <th className="px-4 py-3 text-left font-semibold w-[35%]" style={{ color: "var(--text-strong)" }}>
                  <button
                    type="button"
                    onClick={() => setSortAsc((s) => !s)}
                    className="inline-flex items-center gap-2"
                    aria-label="Sort by Title"
                  >
                    Title
                    <span style={{ color: "var(--text-soft)" }}>
                      {sortAsc ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </th>

                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-strong)" }}>
                  spamreport
                </th>

                {/* View column */}
                <th className="px-4 py-3 text-left font-semibold w-[120px]" style={{ color: "var(--text-strong)" }}>
                  View
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center">
                    <span className="inline-flex items-center gap-2" style={{ color: "var(--text-body)" }}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading spam reports...
                    </span>
                  </td>
                </tr>
              )}

              {!loading &&
                sortedRows.map((r) => (
                  <tr 
                    key={r.id} 
                    className="border-b" 
                    style={{ 
                      backgroundColor: "var(--surface)", 
                      borderColor: "var(--border)" 
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-body)" }}>{r.title}</td>

                    {/* show 20 words + ... */}
                    <td className="px-4 py-3" style={{ color: "var(--text-body)" }}>
                      {truncateWords(r.spamreport, 20)}
                    </td>

                    {/* view button */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openView(r)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded border transition-colors"
                        style={{ 
                          borderColor: "var(--border)", 
                          color: "var(--text-body)",
                          backgroundColor: "transparent"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--surface-2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
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
                  <td colSpan={3} className="px-4 py-10 text-center" style={{ color: "var(--text-soft)" }}>
                    No spam reports found.
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center" style={{ color: "var(--danger)" }}>
                    {error}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div 
          className="px-4 py-3 flex items-center justify-between text-xs border-t"
          style={{ 
            color: "var(--text-soft)", 
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)"
          }}
        >
          <div>
            Page <span className="font-semibold" style={{ color: "var(--text-strong)" }}>{page}</span> of{" "}
            <span className="font-semibold" style={{ color: "var(--text-strong)" }}>{lastPage}</span>
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50 transition-colors"
              style={{ 
                borderColor: "var(--border)", 
                color: "var(--text-body)",
                backgroundColor: "transparent"
              }}
              disabled={loading || page <= 1}
              onClick={() => loadSpamReports(page - 1)}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = "var(--surface-2)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50 transition-colors"
              style={{ 
                borderColor: "var(--border)", 
                color: "var(--text-body)",
                backgroundColor: "transparent"
              }}
              disabled={loading || page >= lastPage}
              onClick={() => loadSpamReports(page + 1)}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = "var(--surface-2)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Next
            </button>
          </div>
        </div>

        {/* Empty area */}
        <div style={{ height: "520px", backgroundColor: "var(--page-bg)" }} />

        <div className="px-4 py-2 text-xs" style={{ color: "var(--text-faint)" }}>
          Copyright 2021 © SMTPMaster.com
        </div>
      </div>

      {/* Modal */}
      {openModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          onMouseDown={(e) => {
            // close on outside click
            if (e.target === e.currentTarget) closeView();
          }}
        >
          <div 
            className="w-full max-w-2xl rounded-xl shadow-lg border overflow-hidden"
            style={{ 
              backgroundColor: "var(--surface)", 
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-panel)"
            }}
          >
            <div 
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate" style={{ color: "var(--text-strong)" }}>
                  {activeRow?.title ?? "Spam Report"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                  Full spam report details
                </p>
              </div>

              <button
                onClick={closeView}
                className="p-2 rounded transition-colors"
                style={{ color: "var(--text-soft)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                aria-label="Close"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div 
                className="text-sm whitespace-pre-wrap leading-6"
                style={{ color: "var(--text-body)" }}
              >
                {activeRow?.spamreport ?? "No details"}
              </div>
            </div>

            <div 
              className="px-5 py-4 border-t flex justify-end gap-2"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={closeView}
                className="px-4 py-2 rounded border transition-colors"
                style={{ 
                  borderColor: "var(--border)", 
                  color: "var(--text-body)",
                  backgroundColor: "transparent"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
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



// "use client";

// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import {
//   ChevronUp,
//   ChevronDown,
//   Loader2,
//   Eye,
//   Search,
//   AlertCircle,
//   CheckCircle2,
//   Info,
//   Calendar,
//   ChevronLeft,
//   ChevronRight,
//   Copy,
//   Check,
//   RefreshCw,
//   Download,
//   Filter,
//   XCircle,
//   Trash2,
//   FileText,
// } from "lucide-react";
// import { token } from "../../common/http";

// type ApiSpamItem = {
//   id: number;
//   title?: string | null;
//   content?: string | null;
//   message?: string | null;
//   spamreport?: string | null;
//   created_at?: string | null;
//   severity?: "low" | "medium" | "high" | "critical";
//   status?: "new" | "reviewed" | "resolved" | "ignored";
// };

// type ApiPaginated<T> = {
//   data: T[];
//   current_page?: number;
//   last_page?: number;
//   per_page?: number;
//   total?: number;
// };

// type ApiResponse = {
//   data?: ApiPaginated<ApiSpamItem>;
//   success?: boolean;
//   message?: string;
//   code?: number;
// };

// type SpamRow = {
//   id: number;
//   title: string;
//   spamreport: string;
//   createdAt?: string;
//   severity: "low" | "medium" | "high" | "critical";
//   status: "new" | "reviewed" | "resolved" | "ignored";
//   source?: string;
// };

// async function safeJson(res: Response) {
//   const text = await res.text();
//   try {
//     return text ? JSON.parse(text) : {};
//   } catch {
//     return { __raw: text };
//   }
// }

// function truncateWords(text: string, maxWords = 20) {
//   const clean = (text || "").replace(/\s+/g, " ").trim();
//   if (!clean) return "";
//   const words = clean.split(" ");
//   if (words.length <= maxWords) return clean;
//   return words.slice(0, maxWords).join(" ") + "…";
// }

// const getSeverityConfig = (severity: SpamRow["severity"]) => {
//   const configs = {
//     low: { color: "text-[var(--info)]", bg: "bg-[var(--info-soft)]", border: "border-[var(--info)]/20", icon: Info, label: "Low" },
//     medium: { color: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]", border: "border-[var(--warning)]/20", icon: AlertCircle, label: "Medium" },
//     high: { color: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]", border: "border-[var(--danger)]/20", icon: AlertCircle, label: "High" },
//     critical: { color: "text-[var(--destructive)]", bg: "bg-[var(--danger-soft)]", border: "border-[var(--destructive)]/20", icon: AlertCircle, label: "Critical" },
//   };
//   return configs[severity];
// };

// const getStatusConfig = (status: SpamRow["status"]) => {
//   const configs = {
//     new: { color: "text-[var(--info)]", bg: "bg-[var(--info-soft)]", border: "border-[var(--info)]/20", label: "New" },
//     reviewed: { color: "text-[var(--brand)]", bg: "bg-[var(--brand-soft)]", border: "border-[var(--brand)]/20", label: "Reviewed" },
//     resolved: { color: "text-[var(--success)]", bg: "bg-[var(--success-soft)]", border: "border-[var(--success)]/20", label: "Resolved" },
//     ignored: { color: "text-[var(--muted-foreground)]", bg: "bg-[var(--surface-soft)]", border: "border-[var(--border)]", label: "Ignored" },
//   };
//   return configs[status];
// };

// export default function SpamReport() {
//   const [rows, setRows] = useState<SpamRow[]>([]);
//   const [filteredRows, setFilteredRows] = useState<SpamRow[]>([]);
//   const [sortAsc, setSortAsc] = useState<boolean>(true);
//   const [sortField, setSortField] = useState<"title" | "createdAt" | "severity" | "status">("createdAt");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [page, setPage] = useState(1);
//   const [lastPage, setLastPage] = useState(1);
//   const [total, setTotal] = useState(0);
//   const [perPage, setPerPage] = useState(10);
  
//   // Search and filter
//   const [searchQuery, setSearchQuery] = useState("");
//   const [severityFilter, setSeverityFilter] = useState<string>("all");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [showFilters, setShowFilters] = useState(false);
  
//   // Accordion state - only one expanded at a time
//   const [expandedId, setExpandedId] = useState<number | null>(null);
  
//   // Copy feedback
//   const [copiedId, setCopiedId] = useState<number | null>(null);

//   const loadSpamReports = useCallback(async (pageNo = 1) => {
//     try {
//       setLoading(true);
//       setError(null);

//       const params = new URLSearchParams({
//         page: pageNo.toString(),
//         per_page: perPage.toString(),
//       });

//       const res = await fetch(`/api/spam-report?${params}`, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//           authorization: `Bearer ${token()}`,
//         },
//         cache: "no-store",
//       });

//       const json: ApiResponse = await safeJson(res);

//       if (!res.ok) {
//         throw new Error((json as any)?.message || `Request failed (${res.status})`);
//       }

//       const list = json?.data?.data ?? [];

//       const mapped: SpamRow[] = list.map((item) => ({
//         id: Number(item?.id ?? Math.random()),
//         title: item?.title?.trim() || "Abuse Reports | From IP and Sending App | Mailing Stopped",
//         spamreport: item?.content?.trim() || item?.spamreport?.trim() || item?.message?.trim() || "Please check your registered email address for more details",
//         createdAt: item?.created_at,
//         severity: (item as any)?.severity || "medium",
//         status: (item as any)?.status || "new",
//         source: (item as any)?.source || "System",
//       }));

//       setRows(mapped);
//       setLastPage(Number(json?.data?.last_page ?? 1) || 1);
//       setTotal(Number(json?.data?.total ?? 0));
//       setPage(Number(json?.data?.current_page ?? pageNo) || pageNo);
//     } catch (e: any) {
//       setRows([]);
//       setError(e?.message ?? "Failed to load spam reports");
//     } finally {
//       setLoading(false);
//     }
//   }, [perPage]);

//   useEffect(() => {
//     loadSpamReports(1);
//   }, [loadSpamReports]);

//   // Apply filters and sorting
//   useEffect(() => {
//     let filtered = [...rows];
    
//     if (searchQuery) {
//       filtered = filtered.filter(row =>
//         row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         row.spamreport.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//     }
    
//     if (severityFilter !== "all") {
//       filtered = filtered.filter(row => row.severity === severityFilter);
//     }
    
//     if (statusFilter !== "all") {
//       filtered = filtered.filter(row => row.status === statusFilter);
//     }
    
//     filtered.sort((a, b) => {
//       let aVal: any = a[sortField];
//       let bVal: any = b[sortField];
      
//       if (sortField === "createdAt") {
//         aVal = new Date(aVal || 0).getTime();
//         bVal = new Date(bVal || 0).getTime();
//       }
      
//       if (aVal < bVal) return sortAsc ? -1 : 1;
//       if (aVal > bVal) return sortAsc ? 1 : -1;
//       return 0;
//     });
    
//     setFilteredRows(filtered);
//   }, [rows, searchQuery, severityFilter, statusFilter, sortField, sortAsc]);

//   const toggleExpand = (id: number) => {
//     setExpandedId(prev => prev === id ? null : id);
//   };

//   const handleSort = (field: typeof sortField) => {
//     if (sortField === field) {
//       setSortAsc(!sortAsc);
//     } else {
//       setSortField(field);
//       setSortAsc(true);
//     }
//   };

//   const handleCopyContent = async (content: string, id: number) => {
//     try {
//       await navigator.clipboard.writeText(content);
//       setCopiedId(id);
//       setTimeout(() => setCopiedId(null), 2000);
//     } catch (err) {
//       console.error("Failed to copy:", err);
//     }
//   };

//   const updateStatus = (id: number, newStatus: SpamRow["status"]) => {
//     setRows(prev => prev.map(r => 
//       r.id === id ? { ...r, status: newStatus } : r
//     ));
//   };

//   const exportToCSV = () => {
//     const headers = ["ID", "Title", "Spam Report", "Created At", "Severity", "Status"];
//     const csvData = filteredRows.map(row => [
//       row.id,
//       `"${row.title.replace(/"/g, '""')}"`,
//       `"${row.spamreport.substring(0, 100).replace(/"/g, '""')}"`,
//       row.createdAt || "",
//       row.severity,
//       row.status,
//     ]);
    
//     const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);
//     link.setAttribute("href", url);
//     link.setAttribute("download", `spam-reports-${new Date().toISOString()}.csv`);
//     link.style.visibility = "hidden";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   const formatDate = (dateStr?: string) => {
//     if (!dateStr) return "N/A";
//     try {
//       const date = new Date(dateStr);
//       return new Intl.DateTimeFormat("en-US", {
//         month: "short",
//         day: "numeric",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       }).format(date);
//     } catch {
//       return "Invalid date";
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[var(--page-bg)]" style={{borderRadius: "var(--page-radius)"}}>
//       {/* Header */}
//       <div className="bg-[var(--brand)] text-[var(--text-on-dark)]" style={{borderRadius: "var(--page-radius)"}}>
//         <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//             <div>
//               <h1 className="text-3xl font-bold tracking-tight">
//                 Spam Reports
//               </h1>
//               <p className="mt-2 text-[var(--text-on-dark)]/80">
//                 Monitor and manage spam reports from your email campaigns
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => loadSpamReports(page)}
//                 className="inline-flex items-center justify-center p-2 bg-[var(--surface)]/10 text-[var(--text-on-dark)] hover:bg-[var(--surface)]/20 transition-colors"
//                 style={{borderRadius: "var(--page-radius)"}}
//                 title="Refresh"
//               >
//                 <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
//               </button>
//               <button
//                 onClick={exportToCSV}
//                 disabled={filteredRows.length === 0}
//                 className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--surface)]/10 text-[var(--text-on-dark)] hover:bg-[var(--surface)]/20 transition-colors disabled:opacity-50"
//                 style={{borderRadius: "var(--page-radius)"}}
//               >
//                 <Download className="h-4 w-4" />
//                 Export
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//           {[
//             { label: "Total Reports", value: total, color: "text-[var(--primary)]", bg: "bg-[var(--primary-soft)]" },
//             { label: "New", value: rows.filter(r => r.status === "new").length, color: "text-[var(--info)]", bg: "bg-[var(--info-soft)]" },
//             { label: "High Severity", value: rows.filter(r => r.severity === "high" || r.severity === "critical").length, color: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
//             { label: "Resolved", value: rows.filter(r => r.status === "resolved").length, color: "text-[var(--success)]", bg: "bg-[var(--success-soft)]" },
//           ].map((stat, idx) => (
//             <div
//               key={idx}
//               className="border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-card)]"
//               style={{borderRadius: "var(--page-radius)"}}
//             >
//               <p className="text-sm text-[var(--text-soft)]">{stat.label}</p>
//               <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
//             </div>
//           ))}
//         </div>

//         {/* Search and Filters */}
//         <div className="mb-6 border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
//           <div className="flex flex-col sm:flex-row gap-3">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
//               <input
//                 type="text"
//                 placeholder="Search by title or content..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full border border-[var(--line-soft)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--line-strong)] focus:ring-2 focus:ring-[var(--ring)]"
//                 style={{borderRadius: "var(--page-radius)"}}
//               />
//             </div>
            
//             <button
//               onClick={() => setShowFilters(!showFilters)}
//               className={`inline-flex items-center gap-2 px-4 py-2.5 border text-sm font-medium transition-all ${
//                 showFilters 
//                   ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]' 
//                   : 'border-[var(--line-soft)] bg-[var(--surface)] text-[var(--text-body)] hover:bg-[var(--surface-soft)]'
//               }`}
//               style={{borderRadius: "var(--page-radius)"}}
//             >
//               <Filter className="h-4 w-4" />
//               Filters
//               {(severityFilter !== "all" || statusFilter !== "all") && (
//                 <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
//               )}
//             </button>
//           </div>
          
//           {showFilters && (
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-[var(--line-soft)]">
//               <select
//                 value={severityFilter}
//                 onChange={(e) => setSeverityFilter(e.target.value)}
//                 className="w-full border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:border-[var(--line-strong)]"
//                 style={{borderRadius: "var(--page-radius)"}}
//               >
//                 <option value="all">All Severities</option>
//                 <option value="low">Low</option>
//                 <option value="medium">Medium</option>
//                 <option value="high">High</option>
//                 <option value="critical">Critical</option>
//               </select>
              
//               <select
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value)}
//                 className="w-full border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:border-[var(--line-strong)]"
//                 style={{borderRadius: "var(--page-radius)"}}
//               >
//                 <option value="all">All Statuses</option>
//                 <option value="new">New</option>
//                 <option value="reviewed">Reviewed</option>
//                 <option value="resolved">Resolved</option>
//                 <option value="ignored">Ignored</option>
//               </select>
//             </div>
//           )}
//         </div>

//         {/* Table */}
//         <div className="border border-[var(--line-soft)] bg-[var(--surface)] shadow-[var(--shadow-panel)] overflow-hidden" style={{borderRadius: "var(--page-radius)"}}>
//           <div className="w-full overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="border-b border-[var(--line-soft)] bg-[var(--surface-2)]">
//                   <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)] w-[30%]">
//                     <button
//                       onClick={() => handleSort("title")}
//                       className="inline-flex items-center gap-2 hover:text-[var(--text-strong)]"
//                     >
//                       Title
//                       {sortField === "title" && (
//                         sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
//                       )}
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
//                     Preview
//                   </th>
//                   <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
//                     <button
//                       onClick={() => handleSort("severity")}
//                       className="inline-flex items-center gap-2 hover:text-[var(--text-strong)]"
//                     >
//                       Severity
//                       {sortField === "severity" && (
//                         sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
//                       )}
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
//                     <button
//                       onClick={() => handleSort("status")}
//                       className="inline-flex items-center gap-2 hover:text-[var(--text-strong)]"
//                     >
//                       Status
//                       {sortField === "status" && (
//                         sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
//                       )}
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
//                     <button
//                       onClick={() => handleSort("createdAt")}
//                       className="inline-flex items-center gap-2 hover:text-[var(--text-strong)]"
//                     >
//                       <Calendar className="h-3 w-3" />
//                       Date
//                       {sortField === "createdAt" && (
//                         sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
//                       )}
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
//                     Action
//                   </th>
//                 </tr>
//               </thead>
              
//               <tbody className="divide-y divide-[var(--line-soft)]">
//                 {loading ? (
//                   <tr>
//                     <td colSpan={6} className="px-6 py-16 text-center">
//                       <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--brand)]" />
//                       <p className="mt-2 text-[var(--text-soft)]">Loading spam reports...</p>
//                     </td>
//                   </tr>
//                 ) : filteredRows.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="px-6 py-16 text-center text-[var(--text-soft)]">
//                       <div className="flex flex-col items-center gap-2">
//                         <FileText className="h-12 w-12 text-[var(--line-soft)]" />
//                         <p>No spam reports found.</p>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : (
//                   filteredRows.map((row) => {
//                     const isExpanded = expandedId === row.id;
//                     const severityConfig = getSeverityConfig(row.severity);
//                     const statusConfig = getStatusConfig(row.status);
//                     const isCopied = copiedId === row.id;
//                     const SeverityIcon = severityConfig.icon;
                    
//                     return (
//                       <React.Fragment key={row.id}>
//                         <tr
//                           className={`transition-colors hover:bg-[var(--surface-soft)] ${
//                             isExpanded ? "bg-[var(--brand-soft)]/30" : ""
//                           }`}
//                         >
//                           <td className="px-6 py-4">
//                             <div className="flex items-center gap-3">
//                               <div className={`p-2 ${isExpanded ? 'bg-[var(--brand)] text-[var(--text-on-dark)]' : 'bg-[var(--surface-soft)] text-[var(--text-soft)]'}`} style={{borderRadius: "var(--page-radius)"}}>
//                                 <FileText className="h-4 w-4" />
//                               </div>
//                               <div>
//                                 <p className="font-semibold text-[var(--text-strong)] line-clamp-1">{row.title}</p>
//                                 <p className="text-xs text-[var(--text-faint)] mt-0.5">ID: #{row.id}</p>
//                               </div>
//                             </div>
//                           </td>
                          
//                           <td className="px-6 py-4">
//                             <p className="text-[var(--text-body)] line-clamp-1 max-w-xs">
//                               {truncateWords(row.spamreport, 12)}
//                             </p>
//                           </td>
                          
//                           <td className="px-6 py-4 text-center">
//                             <span className={`inline-flex items-center gap-1.5 rounded-full border ${severityConfig.border} ${severityConfig.bg} px-2.5 py-1 text-xs font-semibold ${severityConfig.color}`}>
//                               <SeverityIcon className="h-3 w-3" />
//                               {severityConfig.label}
//                             </span>
//                           </td>
                          
//                           <td className="px-6 py-4 text-center">
//                             <span className={`inline-flex items-center gap-1.5 rounded-full border ${statusConfig.border} ${statusConfig.bg} px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}>
//                               {statusConfig.label}
//                             </span>
//                           </td>
                          
//                           <td className="px-6 py-4 text-[var(--text-body)] text-xs">
//                             {formatDate(row.createdAt)}
//                           </td>
                          
//                           <td className="px-6 py-4 text-right">
//                             <button
//                               onClick={() => toggleExpand(row.id)}
//                               className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all ${
//                                 isExpanded 
//                                   ? 'bg-[var(--brand)] text-[var(--text-on-dark)] hover:bg-[var(--brand-strong)]' 
//                                   : 'bg-[var(--surface-soft)] text-[var(--text-body)] hover:bg-[var(--surface-soft-2)]'
//                               }`}
//                               style={{borderRadius: "var(--page-radius)"}}
//                             >
//                               {isExpanded ? (
//                                 <>
//                                   <ChevronUp className="h-4 w-4" />
//                                   Close
//                                 </>
//                               ) : (
//                                 <>
//                                   <Eye className="h-4 w-4" />
//                                   View
//                                 </>
//                               )}
//                             </button>
//                           </td>
//                         </tr>

//                         {/* Expandable Details Row */}
//                         <tr>
//                           <td colSpan={6} className="p-0">
//                             <div 
//                               className={`overflow-hidden transition-all duration-300 ease-in-out ${
//                                 isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
//                               }`}
//                             >
//                               <div className="border-t border-[var(--brand)]/20 bg-[var(--surface-2)] p-6">
//                                 <div className="flex items-center justify-between mb-4">
//                                   <h3 className="text-lg font-semibold text-[var(--text-strong)] flex items-center gap-2">
//                                     <AlertCircle className="h-5 w-5 text-[var(--brand)]" />
//                                     Report Details
//                                   </h3>
//                                   <div className="flex items-center gap-2">
//                                     <button
//                                       onClick={() => handleCopyContent(row.spamreport, row.id)}
//                                       className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--line-soft)] bg-[var(--surface)] text-[var(--text-body)] hover:bg-[var(--surface-soft)] transition-colors"
//                                       style={{borderRadius: "var(--page-radius)"}}
//                                     >
//                                       {isCopied ? (
//                                         <Check className="h-3.5 w-3.5 text-[var(--success)]" />
//                                       ) : (
//                                         <Copy className="h-3.5 w-3.5" />
//                                       )}
//                                       {isCopied ? "Copied" : "Copy"}
//                                     </button>
//                                   </div>
//                                 </div>

//                                 <div className="grid gap-6 lg:grid-cols-3">
//                                   {/* Full Content */}
//                                   <div className="lg:col-span-2 space-y-3">
//                                     <label className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider">
//                                       Full Report Content
//                                     </label>
//                                     <div className="border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] max-h-64 overflow-y-auto" style={{borderRadius: "var(--page-radius)"}}>
//                                       <pre className="text-sm text-[var(--text-body)] whitespace-pre-wrap font-mono leading-relaxed">
//                                         {row.spamreport}
//                                       </pre>
//                                     </div>
//                                   </div>

//                                   {/* Metadata & Actions */}
//                                   <div className="space-y-4">
//                                     <div className="border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
//                                       <h4 className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider mb-3">
//                                         Report Metadata
//                                       </h4>
//                                       <div className="space-y-2 text-sm">
//                                         <div className="flex justify-between">
//                                           <span className="text-[var(--text-faint)]">Report ID</span>
//                                           <span className="text-[var(--text-strong)] font-mono">#{row.id}</span>
//                                         </div>
//                                         <div className="flex justify-between">
//                                           <span className="text-[var(--text-faint)]">Source</span>
//                                           <span className="text-[var(--text-body)]">{row.source}</span>
//                                         </div>
//                                         <div className="flex justify-between">
//                                           <span className="text-[var(--text-faint)]">Created</span>
//                                           <span className="text-[var(--text-body)]">{formatDate(row.createdAt)}</span>
//                                         </div>
//                                       </div>
//                                     </div>

//                                     <div className="border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" style={{borderRadius: "var(--page-radius)"}}>
//                                       <h4 className="text-xs font-semibold text-[var(--text-soft)] uppercase tracking-wider mb-3">
//                                         Quick Actions
//                                       </h4>
//                                       <div className="space-y-2">
//                                         {row.status !== "reviewed" && (
//                                           <button
//                                             onClick={() => updateStatus(row.id, "reviewed")}
//                                             className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-[var(--info)]/20 bg-[var(--info-soft)] text-[var(--info)] hover:bg-[var(--info)]/20 transition-colors"
//                                             style={{borderRadius: "var(--page-radius)"}}
//                                           >
//                                             <Eye className="h-3.5 w-3.5" />
//                                             Mark as Reviewed
//                                           </button>
//                                         )}
//                                         {row.status !== "resolved" && (
//                                           <button
//                                             onClick={() => updateStatus(row.id, "resolved")}
//                                             className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors"
//                                             style={{borderRadius: "var(--page-radius)"}}
//                                           >
//                                             <CheckCircle2 className="h-3.5 w-3.5" />
//                                             Mark as Resolved
//                                           </button>
//                                         )}
//                                         {row.status !== "ignored" && (
//                                           <button
//                                             onClick={() => updateStatus(row.id, "ignored")}
//                                             className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-[var(--line-soft)] bg-[var(--surface-soft)] text-[var(--text-soft)] hover:bg-[var(--surface-soft-2)] transition-colors"
//                                             style={{borderRadius: "var(--page-radius)"}}
//                                           >
//                                             <XCircle className="h-3.5 w-3.5" />
//                                             Ignore Report
//                                           </button>
//                                         )}
//                                         <button
//                                           className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
//                                           style={{borderRadius: "var(--page-radius)"}}
//                                         >
//                                           <Trash2 className="h-3.5 w-3.5" />
//                                           Delete Report
//                                         </button>
//                                       </div>
//                                     </div>
//                                   </div>
//                                 </div>
//                               </div>
//                             </div>
//                           </td>
//                         </tr>
//                       </React.Fragment>
//                     );
//                   })
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           {!loading && filteredRows.length > 0 && (
//             <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-4">
//               <div className="text-sm text-[var(--text-soft)]">
//                 Showing <span className="font-semibold text-[var(--text-strong)]">{filteredRows.length}</span> of{" "}
//                 <span className="font-semibold text-[var(--text-strong)]">{total}</span> reports
//               </div>
              
//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={() => loadSpamReports(page - 1)}
//                   disabled={loading || page <= 1}
//                   className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
//                   style={{borderRadius: "var(--page-radius)"}}
//                 >
//                   <ChevronLeft className="h-4 w-4" />
//                   Prev
//                 </button>
                
//                 <span className="px-4 py-2 text-sm font-medium text-[var(--text-strong)]">
//                   Page {page} of {lastPage}
//                 </span>
                
//                 <button
//                   onClick={() => loadSpamReports(page + 1)}
//                   disabled={loading || page >= lastPage}
//                   className="inline-flex items-center gap-1 border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
//                   style={{borderRadius: "var(--page-radius)"}}
//                 >
//                   Next
//                   <ChevronRight className="h-4 w-4" />
//                 </button>
//               </div>

//               <select
//                 value={perPage}
//                 onChange={(e) => setPerPage(Number(e.target.value))}
//                 className="border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:border-[var(--line-strong)]"
//                 style={{borderRadius: "var(--page-radius)"}}
//               >
//                 <option value={10}>10 per page</option>
//                 <option value={25}>25 per page</option>
//                 <option value={50}>50 per page</option>
//               </select>
//             </div>
//           )}
//         </div>

//         <div className="mt-6 text-center text-xs text-[var(--text-faint)]">
//           Copyright 2021 © SMTPMaster.com
//         </div>
//       </div>
//     </div>
//   );
// }



