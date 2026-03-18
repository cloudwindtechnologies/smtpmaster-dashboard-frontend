"use client"

import React, { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { token } from "../../common/http"

type ApiPlanRow = {
  plan_id: number
  package_name: string
  start_date: string
  end_date: string
  status: "Active" | "Expired" | "Upcoming" | string
}

type ApiResponse = {
  draw?: number
  recordsTotal?: number
  recordsFiltered?: number
  data: ApiPlanRow[]
}

function clearClientAuth() {
  try {
    localStorage.removeItem("token")
    localStorage.removeItem("access_token")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_token")
    localStorage.removeItem("role")
  } catch {}
}

function toDateOnly(iso: string) {
  if (!iso) return ""
  return iso.split("T")[0]
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function PackageInfo() {
  const [plans, setPlans] = useState<ApiPlanRow[]>([])
  const [loading, setLoading] = useState(true)

  // UI states
  const [entries, setEntries] = useState(10)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const fetchPlans = async () => {
    try {
      setLoading(true)

      // ✅ no qs, no id — exactly what you want
      const res = await fetch("/api/package-info/get_all_plans", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      })

      if (res.status === 401) {
        clearClientAuth()
        window.location.href = "/login"
        return
      }

      const json: ApiResponse | any = await res.json()

      if (!res.ok) {
        throw new Error(json?.errors || json?.message || "Failed to load plans")
      }

      setPlans(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  // ✅ client-side search (does not touch backend)
  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plans
    return plans.filter((p) => (p.package_name || "").toLowerCase().includes(q))
  }, [plans, search])

  // reset to page 1 when search or entries changes
  useEffect(() => {
    setPage(1)
  }, [search, entries])

  const totalEntries = filteredPlans.length
  const pageSize = entries

  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const currentPage = clamp(page, 1, totalPages)

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalEntries)

  const pageRows = useMemo(() => {
    return filteredPlans.slice(startIndex, endIndex)
  }, [filteredPlans, startIndex, endIndex])

  // ✅ page buttons (Netflix style not asked, so keep simple like your UI)
  const pageNumbers = useMemo(() => {
    // show max 5 page buttons
    const maxButtons = 5
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // sliding window
    const half = Math.floor(maxButtons / 2)
    let start = currentPage - half
    let end = currentPage + half

    if (start < 1) {
      start = 1
      end = maxButtons
    }
    if (end > totalPages) {
      end = totalPages
      start = totalPages - maxButtons + 1
    }

    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [totalPages, currentPage])

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1
  const showingTo = endIndex

  return (
    <div className="w-full space-y-6">

      {/* ================= Plans History ================= */}
      <div className="bg-white border border-gray-300 rounded shadow-sm">
        <div className="px-4 py-3 border-b border-gray-300 font-semibold flex items-center justify-between">
          <span>Plans History</span>

          <button
            onClick={fetchPlans}
            className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={entries}
              onChange={(e) => setEntries(Number(e.target.value))}
              disabled={loading}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span>Search:</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-y border-gray-400">
                <th className="px-4 py-3 text-left font-semibold">Plan Name</th>
                <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                <th className="px-4 py-3 text-left font-semibold">End Date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-600">
                    Loading...
                  </td>
                </tr>
              ) : totalEntries === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-600">
                    No plan history found
                  </td>
                </tr>
              ) : (
                pageRows.map((plan) => (
                  <tr key={`${plan.plan_id}-${plan.start_date}`} className="border-b border-gray-300">
                    <td className="px-4 py-3">{plan.package_name}</td>
                    <td className="px-4 py-3">{toDateOnly(plan.start_date)}</td>
                    <td className="px-4 py-3">{toDateOnly(plan.end_date)}</td>
                    <td className="px-4 py-3">
                      {plan.status === "Active" ? (
                        <span className="inline-block rounded bg-green-600 px-2 py-1 text-xs text-white">
                          Active
                        </span>
                      ) : plan.status === "Upcoming" ? (
                        <span className="inline-block rounded bg-blue-600 px-2 py-1 text-xs text-white">
                          Upcoming
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-red-600 px-2 py-1 text-xs text-white">
                          {plan.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer + Pagination */}
        <div className="px-4 py-3 text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            Showing {showingFrom} to {showingTo} of {totalEntries} entries
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              className={clamp(currentPage - 1, 1, totalPages) === currentPage ? "text-gray-400" : "text-gray-700 hover:text-black"}
              disabled={currentPage === 1 || loading || totalEntries === 0}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            {/* First + dots */}
            {totalPages > 5 && pageNumbers[0] !== 1 ? (
              <>
                <button
                  className={cnPageBtn(1, currentPage)}
                  onClick={() => setPage(1)}
                  disabled={loading}
                >
                  1
                </button>
                <span className="px-1 text-gray-500">…</span>
              </>
            ) : null}

            {/* Middle pages */}
            {pageNumbers.map((n) => (
              <button
                key={n}
                className={cnPageBtn(n, currentPage)}
                onClick={() => setPage(n)}
                disabled={loading}
              >
                {n}
              </button>
            ))}

            {/* Last + dots */}
            {totalPages > 5 && pageNumbers[pageNumbers.length - 1] !== totalPages ? (
              <>
                <span className="px-1 text-gray-500">…</span>
                <button
                  className={cnPageBtn(totalPages, currentPage)}
                  onClick={() => setPage(totalPages)}
                  disabled={loading}
                >
                  {totalPages}
                </button>
              </>
            ) : null}

            <button
              className={clamp(currentPage + 1, 1, totalPages) === currentPage ? "text-gray-400" : "text-gray-700 hover:text-black"}
              disabled={currentPage === totalPages || loading || totalEntries === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* small helper for pagination button styling (same look as your UI) */
function cnPageBtn(n: number, currentPage: number) {
  const base = "border border-gray-400 px-2 py-1"
  if (n === currentPage) return `${base} bg-gray-200 font-semibold`
  return `${base} hover:bg-gray-50`
}