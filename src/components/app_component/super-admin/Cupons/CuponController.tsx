"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  Search,
  X,
  Tag,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  Clock,
  Gift,
  TrendingUp,
  Layers,
  MoreVertical,
  BarChart,
  AlertCircle,
} from "lucide-react"
import { apiURL, token } from "../../common/http"

const API_BASE = apiURL || "https://your-api.com"

const ENDPOINTS = {
  list: () => `${API_BASE}/api/v1/admin/coupons`,
  create: () => `${API_BASE}/api/v1/admin/coupons`,
  update: (id: number) => `${API_BASE}/api/v1/admin/coupons/${id}`,
  destroy: (id: number) => `${API_BASE}/api/v1/admin/coupons/${id}`,
  byPlan: (planId: number) => `${API_BASE}/api/v1/admin/coupons/plan/${planId}`,
}

type ApiErrorBag = Record<string, string[]>

type Coupon = {
  id: number
  plan_id: number
  couponcode: string
  is_active?: boolean | number
  start_date?: string | null
  end_date?: string | null
  discount_amount?: number | string | null
  created_at?: string
  updated_at?: string
}

type CouponForm = {
  plan_id: string
  couponcode: string
  is_active: boolean
  start_date: string
  end_date: string
  discount_amount: string
}

function emptyForm(): CouponForm {
  return {
    plan_id: "",
    couponcode: "",
    is_active: true,
    start_date: "",
    end_date: "",
    discount_amount: "",
  }
}

function toNumberSafe(v: string, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function getFirstError(errors: ApiErrorBag | null, key: keyof CouponForm) {
  return errors?.[key as string]?.[0]
}

function buildMessageFromErrorBag(errors?: ApiErrorBag) {
  if (!errors) return ""
  const firstKey = Object.keys(errors)[0]
  if (!firstKey) return ""
  const firstMsg = errors[firstKey]?.[0]
  return firstMsg ? `${firstKey}: ${firstMsg}` : ""
}

async function apiFetch<T>(
  url: string,
  opts: RequestInit = {},
  router?: { replace: (path: string) => void },
  onUnauthorized?: () => void
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string; errors?: ApiErrorBag }> {
  const t = token()

  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
    cache: "no-store",
  })

  // ✅ Redirect on Unauthorized ASAP
  if (res.status === 401) {
    onUnauthorized?.()
    router?.replace("/login")
    return { ok: false, status: 401, message: "Unauthorized" }
  }

  const ct = res.headers.get("content-type") || ""
  const isJson = ct.includes("application/json")

  let body: any = null
  try {
    body = isJson ? await res.json() : await res.text()
  } catch {
    body = null
  }

  if (!res.ok) {
    const hasErrorBag = body?.error && typeof body.error === "object" && !Array.isArray(body.error)
    const errors = hasErrorBag ? (body.error as ApiErrorBag) : undefined

    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
        ? body.error
        : hasErrorBag
        ? "Validation error"
        : typeof body === "string"
        ? body
        : `Request failed (${res.status})`

    return { ok: false, status: res.status, message, errors }
  }

  const normalized = body?.data ?? body
  return { ok: true, data: normalized as T }
}

export default function CouponsPage() {
  const router = useRouter()

  // ✅ Auth gate to stop 2 sec flash
  const [authReady, setAuthReady] = useState(false)
  const [authBlocked, setAuthBlocked] = useState(false)

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<ApiErrorBag | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponForm>(emptyForm())
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  // Stats
  const totalCoupons = coupons.length
  const activeCoupons = coupons.filter((c) => {
    if (typeof c.is_active === "number") return c.is_active === 1
    return !!c.is_active
  }).length
  const expiredCoupons = coupons.filter((c) => {
    if (!c.end_date) return false
    return new Date(c.end_date) < new Date()
  }).length

  // Client-side validation
  const clientErrors = useMemo(() => {
    const errs: Partial<Record<keyof CouponForm, string>> = {}

    if (!form.plan_id.trim()) errs.plan_id = "Plan ID is required"
    if (!form.couponcode.trim()) errs.couponcode = "Coupon code is required"
    if (!form.start_date) errs.start_date = "Start date is required"
    if (!form.end_date) errs.end_date = "End date is required"
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errs.end_date = "End date must be after start date"
    }
    if (form.discount_amount !== "" && toNumberSafe(form.discount_amount, NaN) < 0) {
      errs.discount_amount = "Discount amount must be 0 or more"
    }

    return errs
  }, [form])

  const canSubmit = useMemo(() => {
    return Object.keys(clientErrors).length === 0 && !saving
  }, [clientErrors, saving])

  const filteredCoupons = useMemo(() => {
    let filtered = coupons

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter((c) => {
        return (
          String(c.id).includes(q) ||
          String(c.plan_id).includes(q) ||
          (c.couponcode || "").toLowerCase().includes(q) ||
          String(c.discount_amount ?? "").toLowerCase().includes(q)
        )
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
        const isActive = typeof c.is_active === "number" ? c.is_active === 1 : !!c.is_active
        if (statusFilter === "active") return isActive
        if (statusFilter === "inactive") return !isActive
        if (statusFilter === "expired") {
          if (!c.end_date) return false
          return new Date(c.end_date) < new Date()
        }
        return true
      })
    }

    return filtered
  }, [coupons, search, statusFilter])

  function resetAlerts() {
    setError("")
    setSuccess("")
    setFieldErrors(null)
  }

  // ✅ Fast check: if token missing -> redirect immediately (no flash)
  useEffect(() => {
    const t = token()
    if (!t) {
      setAuthBlocked(true)
      router.replace("/login")
      return
    }
    setAuthReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCoupons() {
    resetAlerts()
    setLoading(true)

    const url = planFilter.trim() ? ENDPOINTS.byPlan(Number(planFilter)) : ENDPOINTS.list()
    const res = await apiFetch<Coupon[]>(
      url,
      { method: "GET" },
      router,
      () => setAuthBlocked(true)
    )

    setLoading(false)

    if (!res.ok) {
      if (res.status !== 401) setError(res.message)
      if (res.errors) setFieldErrors(res.errors)
      setCoupons([])
      return
    }

    const list = Array.isArray(res.data) ? res.data : []
    setCoupons(
      list.map((c) => ({
        ...c,
        is_active: typeof c.is_active === "number" ? c.is_active === 1 : !!c.is_active,
      }))
    )
  }

  useEffect(() => {
    if (!authReady) return
    loadCoupons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, planFilter])

  function openCreate() {
    resetAlerts()
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(c: Coupon) {
    resetAlerts()
    setEditing(c)
    setForm({
      plan_id: String(c.plan_id ?? ""),
      couponcode: c.couponcode ?? "",
      is_active: typeof c.is_active === "number" ? c.is_active === 1 : !!c.is_active,
      start_date: c.start_date ?? "",
      end_date: c.end_date ?? "",
      discount_amount: c.discount_amount == null ? "" : String(c.discount_amount),
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm())
    setFieldErrors(null)
  }

  function setField<K extends keyof CouponForm>(key: K, value: CouponForm[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function submit() {
    resetAlerts()

    if (!canSubmit) {
      setError("Please fix the form errors before submitting.")
      return
    }

    setSaving(true)

    const payload = {
      plan_id: toNumberSafe(form.plan_id),
      couponcode: form.couponcode.trim(),
      is_active: form.is_active,
      start_date: form.start_date,
      end_date: form.end_date,
      discount_amount: form.discount_amount === "" ? 0 : toNumberSafe(form.discount_amount),
    }

    const isEdit = !!editing
    const url = isEdit ? ENDPOINTS.update(editing!.id) : ENDPOINTS.create()
    const method = isEdit ? "PUT" : "POST"

    const res = await apiFetch<Coupon>(
      url,
      { method, body: JSON.stringify(payload) },
      router,
      () => setAuthBlocked(true)
    )

    setSaving(false)

    if (!res.ok) {
      if (res.status !== 401) {
        setError(res.message || "Request failed")
        if (res.errors) {
          setFieldErrors(res.errors)
          const bagMsg = buildMessageFromErrorBag(res.errors)
          if (bagMsg) setError(bagMsg)
        }
      }
      return
    }

    setSuccess(isEdit ? "Coupon updated successfully" : "Coupon created successfully")
    closeModal()
    await loadCoupons()
  }

  async function removeCoupon(c: Coupon) {
    resetAlerts()
    const ok = confirm(`Delete coupon "${c.couponcode}"?`)
    if (!ok) return

    setLoading(true)
    const res = await apiFetch<null>(
      ENDPOINTS.destroy(c.id),
      { method: "DELETE" },
      router,
      () => setAuthBlocked(true)
    )
    setLoading(false)

    if (!res.ok) {
      if (res.status !== 401) setError(res.message)
      if (res.errors) setFieldErrors(res.errors)
      return
    }

    setSuccess("Coupon deleted successfully")
    await loadCoupons()
  }

  function fieldErrorText(name: keyof CouponForm) {
    return getFirstError(fieldErrors, name) || (clientErrors[name] as string | undefined) || ""
  }

  function getStatusBadge(coupon: Coupon) {
    const isActive = typeof coupon.is_active === "number" ? coupon.is_active === 1 : !!coupon.is_active

    if (!isActive) {
      return {
        label: "Inactive",
        className: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300",
        icon: XCircle,
      }
    }

    if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
      return {
        label: "Expired",
        className: "bg-gradient-to-r from-red-100 to-orange-100 text-red-700 border-red-300",
        icon: AlertCircle,
      }
    }

    return {
      label: "Active",
      className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-300",
      icon: CheckCircle,
    }
  }

  // ✅ Block rendering to prevent flash for unauthorized users
  if (authBlocked || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg">
          <RefreshCcw className="h-5 w-5 animate-spin text-blue-600" />
          <div>
            <div className="text-sm font-semibold text-slate-800">Checking session…</div>
            <div className="text-xs text-slate-600">Redirecting if needed</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative px-4 md:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Coupon Management
                </h1>
                <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                  <span>Create and manage discount coupons</span>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span className="text-blue-600 font-medium">{totalCoupons} total</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadCoupons}
                className="group relative px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-white hover:border-blue-300 hover:text-blue-700 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-60 flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCcw
                  className={`h-4 w-4 transition-transform duration-500 group-hover:rotate-180 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={openCreate}
                className="group relative px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
                <span className="hidden sm:inline">New Coupon</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { icon: Layers, label: "Total Coupons", value: totalCoupons, color: "from-blue-600 to-indigo-600", bg: "from-blue-50 to-indigo-50" },
              { icon: CheckCircle, label: "Active", value: activeCoupons, color: "from-green-600 to-emerald-600", bg: "from-green-50 to-emerald-50" },
              { icon: Clock, label: "Expired", value: expiredCoupons, color: "from-red-600 to-orange-600", bg: "from-red-50 to-orange-50" },
              { icon: TrendingUp, label: "Usage Rate", value: `${totalCoupons ? Math.round((activeCoupons / totalCoupons) * 100) : 0}%`, color: "from-purple-600 to-pink-600", bg: "from-purple-50 to-pink-50" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-slate-800">{stat.value}</span>
                  </div>
                  <p className="text-sm text-slate-600">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="mb-6 space-y-3">
          {error && (
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-4 animate-slideDown">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={() => setError("")} className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors">
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 animate-slideDown">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">{success}</p>
                <button onClick={() => setSuccess("")} className="ml-auto p-1 hover:bg-green-100 rounded-full transition-colors">
                  <X className="h-4 w-4 text-green-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search coupons..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  showFilters
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 hover:bg-white hover:border-blue-300"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
              </button>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 appearance-none cursor-pointer min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>

              {/* Plan Filter */}
              <input
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                placeholder="Plan ID filter"
                className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 w-32"
                inputMode="numeric"
              />
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  viewMode === "table"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300"
                }`}
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  viewMode === "grid"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300"
                }`}
              >
                <BarChart className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl animate-slideDown">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Date Range</label>
                  <div className="flex gap-2">
                    <input type="date" className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="From" />
                    <input type="date" className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="To" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Discount Range</label>
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Min" />
                    <input type="number" className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Max" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      setSearch("")
                      setPlanFilter("")
                      setStatusFilter("all")
                    }}
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all duration-300"
                  >
                    Clear All
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl overflow-hidden">
          {viewMode === "table" ? (
            // Table View
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">ID</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">Plan</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">Code</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">Discount</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">Period</th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 blur-xl opacity-20 animate-pulse"></div>
                            <RefreshCcw className="h-6 w-6 animate-spin text-blue-600 relative z-10" />
                          </div>
                          <span className="text-slate-600">Loading coupons...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Tag className="h-12 w-12 text-slate-300" />
                          <p className="text-slate-600">No coupons found</p>
                          <button
                            onClick={openCreate}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300"
                          >
                            Create your first coupon
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((c) => {
                      const status = getStatusBadge(c)
                      const StatusIcon = status.icon
                      return (
                        <tr
                          key={c.id}
                          className="group border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300"
                        >
                          <td className="px-6 py-4 font-medium text-slate-700">#{c.id}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg text-xs font-medium">
                              Plan {c.plan_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-slate-400" />
                              <span className="font-mono font-medium text-slate-700">{c.couponcode}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <DollarSign className="h-4 w-4" />
                              {c.discount_amount ?? 0}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.className}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{c.start_date ? new Date(c.start_date).toLocaleDateString() : "-"}</span>
                              <span>→</span>
                              <span>{c.end_date ? new Date(c.end_date).toLocaleDateString() : "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(c)}
                                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-all duration-300 hover:scale-110"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeCoupon(c)}
                                className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all duration-300 hover:scale-110"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all duration-300"
                                title="More options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid View
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCoupons.map((c) => {
                  const status = getStatusBadge(c)
                  const StatusIcon = status.icon
                  return (
                    <div
                      key={c.id}
                      className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg">
                              <Tag className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-mono font-bold text-slate-800">{c.couponcode}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${status.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Plan ID:</span>
                            <span className="font-medium text-slate-800">#{c.plan_id}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Discount:</span>
                            <span className="font-bold text-emerald-600">₹{c.discount_amount ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Period:</span>
                            <span className="text-slate-800">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "-"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Ends:</span>
                            <span className="text-slate-800">{c.end_date ? new Date(c.end_date).toLocaleDateString() : "-"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-all duration-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeCoupon(c)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all duration-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="relative px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="absolute inset-0 bg-white/5"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    {editing ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {editing ? `Edit Coupon #${editing.id}` : "Create New Coupon"}
                    </h2>
                    <p className="text-xs text-blue-100 mt-0.5">
                      {editing ? "Update coupon details" : "Fill in the details to create a new coupon"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/20 rounded-xl text-white transition-all duration-300"
                  disabled={saving}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Plan ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.plan_id}
                    onChange={(e) => setField("plan_id", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="Enter plan ID"
                    inputMode="numeric"
                    disabled={!!editing || saving}
                  />
                  {fieldErrorText("plan_id") && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrorText("plan_id")}
                    </p>
                  )}
                </div>

                {/* Coupon Code */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-blue-600" />
                    Coupon Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.couponcode}
                    onChange={(e) => setField("couponcode", e.target.value)}
                    readOnly={!!editing}
                    disabled={!!editing || saving}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 disabled:bg-slate-50 disabled:cursor-not-allowed font-mono"
                    placeholder="e.g. SUMMER50"
                  />
                  {fieldErrorText("couponcode") && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrorText("couponcode")}
                    </p>
                  )}
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                    disabled={saving}
                  />
                  {fieldErrorText("start_date") && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrorText("start_date")}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.end_date}
                    onChange={(e) => setField("end_date", e.target.value)}
                    type="date"
                    min={form.start_date || undefined}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                    disabled={saving}
                  />
                  {fieldErrorText("end_date") && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrorText("end_date")}
                    </p>
                  )}
                </div>

                {/* Discount Amount */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Discount Amount
                  </label>
                  <input
                    value={form.discount_amount}
                    onChange={(e) => setField("discount_amount", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                    placeholder="0"
                    inputMode="decimal"
                    disabled={saving}
                  />
                  {fieldErrorText("discount_amount") && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrorText("discount_amount")}
                    </p>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2 pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setField("is_active", e.target.checked)}
                      className="sr-only peer"
                      disabled={saving}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600"></div>
                    <span className="ms-3 text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Validation Errors */}
              {fieldErrors && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    Validation Errors
                  </div>
                  <ul className="space-y-1">
                    {Object.entries(fieldErrors).map(([k, v]) => (
                      <li key={k} className="text-xs text-red-700 flex items-start gap-2">
                        <span className="font-medium min-w-[80px]">{k}:</span>
                        <span>{v?.[0]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-white hover:border-blue-300 transition-all duration-300"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editing ? "Update Coupon" : "Create Coupon"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
