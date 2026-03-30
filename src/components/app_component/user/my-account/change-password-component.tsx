"use client"

import React, { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { token, apiURL } from "../../common/http"
import {
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building,
  Lock,
  Save,
  Monitor,
  RefreshCcw,
  ShieldAlert,
  LogOut,
  Laptop,
  Smartphone,
  Tablet,
  Tv,
  Chrome,
  Globe as GlobeIcon,
  Clock,
  Info,
  Shield,
  ChevronRight,
} from "lucide-react"

type TabKey = "information" | "password" | "devices"

type ApiProfile = {
  login_user_id?: number
  login_user_first_name: string
  login_user_last_name: string
  login_user_image?: string | null
  login_user_email: string
  login_user_mobile: string
  login_user_role_id?: string | null
  login_user_vmta_pool_id?: string | null
  login_user_date_time?: string | null

  status?: string | null
  country?: string | null
  address?: string | null
  zipcode?: string | null
  city?: string | null
  website?: string | null

  updated_at?: string | null
  last_updated_at?: string | null
}

type LoginTokenItem = {
  id: number
  ip_address?: string | null
  browser_details?: string | null
  created_at?: string | null
}

const API_BASE = apiURL || ""

const API = {
  GET_PROFILE: "/api/auth/profileMe",
  UPDATE_PROFILE: "/api/my-accounts/profile",
  UPDATE_PASSWORD: "/api/my-accounts/updateNewPassword",
  GET_VALID_LOGIN_TOKENS: `${API_BASE}/api/v1/getValidLoginToken`,
  DELETE_LOGIN_TOKEN: (id: number) => `${API_BASE}/api/v1/deleteLoginToken/${id}`,
  LOGOUT_CURRENT: `${API_BASE}/api/v1/logout`,
  LOGOUT_ALL_DEVICES: `${API_BASE}/api/v1/deleteOldLoginTokens`,
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function getDeviceType(browserDetails?: string | null): { type: string; icon: any; gradient: string } {
  const details = browserDetails?.toLowerCase() || ""

  if (details.includes("mobile") || details.includes("android") || details.includes("iphone")) {
    return {
      type: "Mobile",
      icon: Smartphone,
      gradient: "from-emerald-400 to-teal-400",
    }
  }
  if (details.includes("tablet") || details.includes("ipad")) {
    return {
      type: "Tablet",
      icon: Tablet,
      gradient: "from-violet-400 to-purple-400",
    }
  }
  if (details.includes("tv") || details.includes("smarttv") || details.includes("apple tv")) {
    return {
      type: "TV",
      icon: Tv,
      gradient: "from-orange-400 to-amber-400",
    }
  }
  if (details.includes("mac") || details.includes("windows") || details.includes("linux")) {
    return {
      type: "Computer",
      icon: Laptop,
      gradient: "from-blue-400 to-indigo-400",
    }
  }
  return {
    type: "Unknown Devices",
    icon: Monitor,
    gradient: "from-gray-400 to-slate-400",
  }
}

function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return "Unknown"

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString()
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "Not available"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Not available"

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getAccountStatus(status?: string | null) {
  if (status === "1") {
    return {
      label: "Active",
      dot: "bg-green-500",
      text: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
    }
  }

  return {
    label: "Inactive",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  }
}

function calculateProfileCompletion(profile: ApiProfile | null): number {
  if (!profile) return 0

  const fields = [
    profile.login_user_first_name,
    profile.login_user_last_name,
    profile.login_user_email,
    profile.login_user_mobile,
    profile.country,
    profile.address,
    profile.zipcode,
    profile.city,
    profile.website,
    profile.login_user_image,
  ]

  const filled = fields.filter((value) => {
    if (value === null || value === undefined) return false
    return String(value).trim() !== ""
  }).length

  return Math.round((filled / fields.length) * 100)
}

function getCompletionWidth(percent: number) {
  if (percent >= 100) return "w-full"
  if (percent >= 90) return "w-[90%]"
  if (percent >= 80) return "w-[80%]"
  if (percent >= 70) return "w-[70%]"
  if (percent >= 60) return "w-[60%]"
  if (percent >= 50) return "w-[50%]"
  if (percent >= 40) return "w-[40%]"
  if (percent >= 30) return "w-[30%]"
  if (percent >= 20) return "w-[20%]"
  if (percent >= 10) return "w-[10%]"
  return "w-[4%]"
}

/* --------------------------- UI Helpers --------------------------- */

function Avatar({
  src,
  name,
  size = "lg",
}: {
  src?: string | null
  name: string
  size?: "sm" | "md" | "lg"
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const sizeClasses = {
    sm: "w-12 h-12 text-sm",
    md: "w-16 h-16 text-lg",
    lg: "w-24 h-24 text-2xl",
  }

  return (
    <div className="relative group">
      <div
        className={cn(
          "rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold overflow-hidden",
          sizeClasses[size]
        )}
      >
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = "blue",
}: {
  icon: React.ElementType
  label: string
  value: string
  color?: "blue" | "green" | "purple" | "orange"
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  }

  return (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", colorClasses[color])}>
      <div className="p-2 rounded-lg bg-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <p className="text-sm font-semibold mt-1">{value || "Not set"}</p>
      </div>
    </div>
  )
}

function InputGroup({
  label,
  icon: Icon,
  required,
  error,
  children,
}: {
  label: string
  icon?: React.ElementType
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-500" />}
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-red-600" />
          {error}
        </p>
      )}
    </div>
  )
}

function Input({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType
}) {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input
        {...props}
        className={cn(
          "w-full h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition-all",
          Icon ? "pl-10" : "",
          "focus:border-blue-500 focus:ring-3 focus:ring-blue-100",
          "disabled:bg-gray-50 disabled:text-gray-500",
          props.className
        )}
      />
    </div>
  )
}

function Button({
  loading,
  children,
  variant = "primary",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: "primary" | "secondary" | "outline" | "danger" | "netflix" | "ghost"
  size?: "sm" | "default" | "lg"
}) {
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger:
      "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/20",
    netflix: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30",
    ghost: "text-gray-600 hover:bg-gray-100",
  }

  const sizeClasses = {
    sm: "h-9 px-3 text-xs rounded-md",
    default: "h-11 px-5 text-sm rounded-lg",
    lg: "h-14 px-8 text-base rounded-lg",
  }

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
        variantClasses[variant],
        sizeClasses[size],
        props.className
      )}
    >
      {loading ? (
        <>
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  )
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

/* ---------------------- Information Tab ---------------------- */
function InformationTab({
  onProfileLoad,
}: {
  onProfileLoad?: (profile: ApiProfile) => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<ApiProfile>({
    login_user_first_name: "",
    login_user_last_name: "",
    login_user_email: "",
    login_user_mobile: "",
    login_user_image: null,
    login_user_date_time: null,
    status: "",
    country: "India",
    address: "",
    zipcode: "",
    city: "",
    website: "",
    updated_at: null,
    last_updated_at: null,
  })

  const set = <K extends keyof ApiProfile>(key: K, value: ApiProfile[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
  }

  const fullName = `${form.login_user_first_name} ${form.login_user_last_name}`.trim()

  const requiredOk = useMemo(() => {
    return (
      form.login_user_email?.trim() &&
      form.login_user_first_name?.trim() &&
      form.login_user_last_name?.trim() &&
      form.login_user_mobile?.trim() &&
      (form.country ?? "").trim() &&
      (form.address ?? "").trim() &&
      (form.zipcode ?? "").trim() &&
      (form.city ?? "").trim()
    )
  }, [form])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      const res = await fetch(API.GET_PROFILE, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token()}`,
        },
        cache: "no-store",
      })

      const json = await res.json()
      const data: ApiProfile = json?.data ?? json

      if (!res.ok || (json?.code && json?.code !== 200)) {
        throw new Error(json?.message || "Failed to load profile")
      }

      const nextForm: ApiProfile = {
        login_user_id: data?.login_user_id,
        login_user_first_name: data?.login_user_first_name ?? "",
        login_user_last_name: data?.login_user_last_name ?? "",
        login_user_image: data?.login_user_image ?? null,
        login_user_email: data?.login_user_email ?? "",
        login_user_mobile: data?.login_user_mobile ?? "",
        login_user_role_id: data?.login_user_role_id ?? "",
        login_user_vmta_pool_id: data?.login_user_vmta_pool_id ?? "",
        login_user_date_time: data?.login_user_date_time ?? null,
        status: data?.status ?? "",
        country: data?.country ?? "India",
        address: data?.address ?? "",
        zipcode: data?.zipcode ?? "",
        city: data?.city ?? "",
        website: data?.website ?? "",
        updated_at: data?.updated_at ?? null,
        last_updated_at: data?.last_updated_at ?? null,
      }

      setForm(nextForm)
      onProfileLoad?.(nextForm)
    } catch (e: any) {
      toast.error(e?.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requiredOk) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      setSaving(true)

      const res = await fetch(API.UPDATE_PROFILE, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok || (json?.code && json?.code !== 200)) {
        throw new Error(json?.message || "Failed to update profile")
      }

      toast.success("Profile updated successfully")
      fetchProfile()
    } catch (e: any) {
      toast.error(e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-100 rounded-2xl p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-gray-200 rounded-full" />
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-8 border border-blue-100">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar name={fullName || "User"} size="lg" />

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900">{fullName || "Anonymous User"}</h2>
            <p className="text-gray-600 mt-2 flex items-center justify-center md:justify-start gap-2">
              <Mail className="h-4 w-4" />
              {form.login_user_email}
            </p>
            <p className="text-gray-600 mt-1 flex items-center justify-center md:justify-start gap-2">
              <Phone className="h-4 w-4" />
              {form.login_user_mobile || "No phone number"}
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-3 min-w-[200px]">
              <StatCard icon={Building} label="Country" value={form.country || "India"} color="blue" />
              <StatCard icon={MapPin} label="City" value={form.city || "Not set"} color="green" />
            </div>
          </div>
        </div>
      </div>

      {/* <form onSubmit={onSubmit} className="space-y-8"> */}
      <form  className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-50">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>

            <div className="space-y-5">
              <InputGroup label="Email Address" icon={Mail} required>
                <Input
                  type="email"
                  value={form.login_user_email}
                  onChange={(e) => set("login_user_email", e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  icon={Mail}
                  readOnly
                />
              </InputGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputGroup label="First Name" required>
                  <Input
                    value={form.login_user_first_name}
                    onChange={(e) => set("login_user_first_name", e.target.value)}
                    readOnly
                  />
                </InputGroup>

                <InputGroup label="Last Name" required>
                  <Input
                    value={form.login_user_last_name}
                    onChange={(e) => set("login_user_last_name", e.target.value)}
                    readOnly
                  />
                </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputGroup label="Phone Number" icon={Phone} required>
                  <Input
                    value={form.login_user_mobile}
                    onChange={(e) => set("login_user_mobile", e.target.value)}
                    icon={Phone}
                    readOnly
                  />
                </InputGroup>

                <InputGroup label="Website" icon={Globe}>
                  <Input
                    value={form.website ?? ""}
                    onChange={(e) => set("website", e.target.value)}
                    icon={Globe}
                    readOnly
                  />
                </InputGroup>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-50">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
            </div>

            <div className="space-y-5">
              <InputGroup label="Address" required>
                <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} readOnly />
              </InputGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputGroup label="ZIP Code" required>
                  <Input value={form.zipcode ?? ""} onChange={(e) => set("zipcode", e.target.value)} readOnly />
                </InputGroup>

                <InputGroup label="City" required>
                  <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} readOnly />
                </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputGroup label="Country" required>
                  <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} readOnly />
                </InputGroup>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-white rounded-2xl border border-blue-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Profile Status</p>
            <p className="text-sm text-gray-600 mt-1">
              {requiredOk ? "All required fields are filled" : "Please fill all required fields"}
            </p>
          </div>
          <Button type="submit" loading={saving} className="min-w-[180px]">
            <Save className="h-4 w-4" />
            Update Profile
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ---------------------- Password Tab ---------------------- */
function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const newPassTouched = newPassword.length > 0
  const confirmTouched = confirmPassword.length > 0

  const isMinLen = newPassword.length >= 8
  const hasNumber = /[0-9]/.test(newPassword)
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasLowercase = /[a-z]/.test(newPassword)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword)
  const letterCount = (newPassword.match(/[A-Za-z]/g) || []).length
  const hasTwoLetters = letterCount >= 2

  const isStrongPassword =
    isMinLen &&
    hasNumber &&
    hasUppercase &&
    hasLowercase &&
    hasSpecialChar &&
    hasTwoLetters

  const passwordsMatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword

  const showMismatch = confirmTouched && newPassword !== confirmPassword

  const getPasswordError = () => {
    if (!newPassTouched) return undefined
    if (!isMinLen) return "Password must be at least 8 characters long"
    if (!hasTwoLetters) return "Password must contain at least 2 letters"
    if (!hasUppercase) return "Password must contain at least 1 uppercase letter"
    if (!hasLowercase) return "Password must contain at least 1 lowercase letter"
    if (!hasNumber) return "Password must contain at least 1 number"
    if (!hasSpecialChar) return "Password must contain at least 1 special character"
    return undefined
  }

  const canSubmit =
    !!currentPassword &&
    !!newPassword &&
    !!confirmPassword &&
    isStrongPassword &&
    passwordsMatch &&
    !loading

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all fields")
      return
    }

    if (!isMinLen) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    if (!hasTwoLetters) {
      toast.error("Password must contain at least 2 letters")
      return
    }

    if (!hasUppercase) {
      toast.error("Password must contain at least 1 uppercase letter")
      return
    }

    if (!hasLowercase) {
      toast.error("Password must contain at least 1 lowercase letter")
      return
    }

    if (!hasNumber) {
      toast.error("Password must contain at least 1 number")
      return
    }

    if (!hasSpecialChar) {
      toast.error("Password must contain at least 1 special character")
      return
    }

    if (!passwordsMatch) {
      toast.error("New password and confirm password do not match")
      return
    }

    try {
      setLoading(true)

      const res = await fetch(API.UPDATE_PASSWORD, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      const json = await res.json()

      if (!res.ok || json?.code !== 200) {
        throw new Error(json?.error || json?.message || "Failed to update password")
      }

      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
            <p className="text-gray-600 text-sm mt-1">
              Update your password to keep your account secure
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-5">
            <InputGroup label="Current Password" icon={Lock} required>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                icon={Lock}
              />
            </InputGroup>

            <InputGroup
              label="New Password"
              icon={Lock}
              required
              error={getPasswordError()}
            >
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                icon={Lock}
              />
            </InputGroup>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-3">Password Requirements</p>

              <ul className="text-xs text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", isMinLen ? "bg-green-500" : "bg-gray-300")} />
                  At least 8 characters
                </li>

                <li className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", hasTwoLetters ? "bg-green-500" : "bg-gray-300")} />
                  At least 2 letters
                </li>

                <li className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", hasUppercase ? "bg-green-500" : "bg-gray-300")} />
                  At least 1 uppercase letter
                </li>

                <li className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", hasLowercase ? "bg-green-500" : "bg-gray-300")} />
                  At least 1 lowercase letter
                </li>

                <li className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", hasNumber ? "bg-green-500" : "bg-gray-300")} />
                  At least 1 number
                </li>

                <li className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", hasSpecialChar ? "bg-green-500" : "bg-gray-300")} />
                  At least 1 special character
                </li>
              </ul>
            </div>

            <InputGroup
              label="Confirm New Password"
              icon={Lock}
              required
              error={showMismatch ? "Passwords do not match" : undefined}
            >
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                icon={Lock}
                className={
                  confirmTouched
                    ? passwordsMatch
                      ? "border-green-500 focus:border-green-500 focus:ring-green-100"
                      : "border-red-500 focus:border-red-500 focus:ring-red-100"
                    : ""
                }
              />
            </InputGroup>
          </div>

          <div className="pt-4">
            <Button type="submit" loading={loading} className="w-full" disabled={!canSubmit}>
              Update Password
            </Button>

            {!canSubmit && (newPassTouched || confirmTouched) ? (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Please meet all password requirements and make sure both passwords match.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------------------- Manage Devices Tab ---------------------- */
function ManageDevicesTab() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<LoginTokenItem[]>([])
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [loggingOutCurrent, setLoggingOutCurrent] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const [showAllDevices, setShowAllDevices] = useState(false)

  const authHeader = () => ({
    Accept: "application/json",
    Authorization: `Bearer ${token()}`,
  })

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await fetch(API.GET_VALID_LOGIN_TOKENS, {
        method: "GET",
        headers: authHeader(),
        cache: "no-store",
      })

      if (res.status === 401) {
        clearClientAuth()
        window.location.href = "/login"
        return
      }

      const json = await res.json()
      if (!res.ok || (json?.code && json?.code !== 200)) {
        throw new Error(json?.message || "Failed to load devices")
      }

      setSessions((json?.data ?? []) as LoginTokenItem[])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load devices")
    } finally {
      setLoading(false)
    }
  }

  const logoutThisDevice = async () => {
    const ok = window.confirm("Sign out from this device now?")
    if (!ok) return

    try {
      setLoggingOutCurrent(true)

      const res = await fetch(API.LOGOUT_CURRENT, {
        method: "GET",
        headers: authHeader(),
      })

      if (res.status === 401) {
        clearClientAuth()
        window.location.href = "/login"
        return
      }

      const json = await res.json()
      if (!res.ok || (json?.code && json?.code !== 200)) {
        throw new Error(json?.message || "Logout failed")
      }

      toast.success("Signed out from this device")
      clearClientAuth()
      window.location.href = "/login"
    } catch (e: any) {
      toast.error(e?.message || "Logout failed")
    } finally {
      setLoggingOutCurrent(false)
    }
  }

  const logoutOneDevice = async (id: number) => {
    const ok = window.confirm("Sign out this device?")
    if (!ok) return

    try {
      setWorkingId(id)

      const res = await fetch(API.DELETE_LOGIN_TOKEN(id), {
        method: "GET",
        headers: authHeader(),
      })

      if (res.status === 401) {
        clearClientAuth()
        window.location.href = "/login"
        return
      }

      const json = await res.json()
      if (!res.ok || (json?.code && json?.code !== 200)) {
        throw new Error(json?.message || "Failed to sign out device")
      }

      toast.success("Device signed out")
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign out device")
    } finally {
      setWorkingId(null)
    }
  }

  const logoutAllDevices = async () => {
    const ok = window.confirm("This will sign out from ALL devices. Continue?")
    if (!ok) return

    try {
      setLoggingOutAll(true)

      const res = await fetch(API.LOGOUT_ALL_DEVICES, {
        method: "GET",
        headers: authHeader(),
      })

      if (res.status === 401) {
        clearClientAuth()
        window.location.href = "/login"
        return
      }

      const json = await res.json()
      if (!res.ok || (json?.code && json?.code !== 200)) {
        throw new Error(json?.message || "Failed to sign out all devices")
      }

      toast.success("Signed out from all devices")
      clearClientAuth()
      window.location.href = "/login"
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign out all devices")
    } finally {
      setLoggingOutAll(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const currentDevice = sessions.length > 0 ? sessions[0] : null
  const otherDevices = sessions.slice(1)
  const displayedOtherDevices = showAllDevices ? otherDevices : otherDevices.slice(0, 3)
  const hasMoreDevices = otherDevices.length > 3

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-50 to-transparent rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-50 to-transparent rounded-full blur-3xl -ml-20 -mb-20" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Manage Access & Devices</h3>
                <p className="text-gray-600 text-sm mt-2 max-w-2xl">
                  These devices have recently accessed your account. Review this list and sign out any devices you don't recognize.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>

              <Button variant="outline" size="sm" onClick={logoutThisDevice} loading={loggingOutCurrent}>
                <LogOut className="h-4 w-4" />
                Sign out this device
              </Button>

              <Button variant="danger" size="sm" onClick={logoutAllDevices} loading={loggingOutAll}>
                <ShieldAlert className="h-4 w-4" />
                Sign out all
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {currentDevice && (
            <div className="relative overflow-hidden rounded-xl bg-white border-2 border-red-200 shadow-lg shadow-red-100">
              <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-transparent to-transparent opacity-50" />

              <div className="relative px-6 py-3 bg-red-50 border-b border-red-100">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">CURRENT DEVICE</span>
                </div>
              </div>

              {(() => {
                const deviceInfo = getDeviceType(currentDevice.browser_details)
                const DeviceIcon = deviceInfo.icon
                const timeAgo = formatTimeAgo(currentDevice.created_at)

                return (
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
                            deviceInfo.gradient
                          )}
                        >
                          <DeviceIcon className="h-7 w-7 text-white" />
                        </div>

                        <div>
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{deviceInfo.type}</h4>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200">
                              This device
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <GlobeIcon className="h-3.5 w-3.5" />
                              {currentDevice.ip_address || "127.0.0.1"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-600 flex items-center gap-1">
                              <Chrome className="h-3.5 w-3.5" />
                              {currentDevice.browser_details || "node"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-600 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Active {timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoutOneDevice(currentDevice.id)}
                        loading={workingId === currentDevice.id}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {otherDevices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Other Devices</h4>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {otherDevices.length} device{otherDevices.length !== 1 ? "s" : ""}
                </span>
              </div>

              {displayedOtherDevices.map((session) => {
                const deviceInfo = getDeviceType(session.browser_details)
                const DeviceIcon = deviceInfo.icon
                const timeAgo = formatTimeAgo(session.created_at)

                return (
                  <div
                    key={session.id}
                    className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm",
                            deviceInfo.gradient
                          )}
                        >
                          <DeviceIcon className="h-5 w-5 text-white" />
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-1.5">{deviceInfo.type}</h5>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <span className="text-gray-500 flex items-center gap-1">
                              <GlobeIcon className="h-3 w-3" />
                              {session.ip_address || "127.0.0.1"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Chrome className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{session.browser_details || "node"}</span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => logoutOneDevice(session.id)}
                        loading={workingId === session.id}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {hasMoreDevices && !showAllDevices && (
                <button
                  onClick={() => setShowAllDevices(true)}
                  className="w-full mt-2 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Show {otherDevices.length - 3} more devices</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {showAllDevices && hasMoreDevices && (
                <button
                  onClick={() => setShowAllDevices(false)}
                  className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}

          {sessions.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No active devices found</h4>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                When you sign in on a new device, it will appear here so you can manage access.
              </p>
            </div>
          )}
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className="text-sm font-medium text-blue-700 mb-1">Security tip</h5>
          <p className="text-xs text-blue-600/80">
            Regularly review your active devices and sign out from any you don't recognize. If you see suspicious activity, change your password immediately.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------------------- Main Page Component ---------------------- */
export default function MyProfilePage() {
  const [tab, setTab] = useState<TabKey>("information")
  const [profileData, setProfileData] = useState<ApiProfile | null>(null)

  const completion = calculateProfileCompletion(profileData)
  const statusMeta = getAccountStatus(profileData?.status)
  const memberSince = formatDate(profileData?.login_user_date_time)
  const lastUpdatedValue = profileData?.last_updated_at || profileData?.updated_at

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-2">Manage your personal information and security settings</p>
            </div>

            {lastUpdatedValue ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Last updated: {formatDate(lastUpdatedValue)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-10">
          <div className="max-w-3xl flex justify-start">
            <div className="flex items-center justify-center border-b border-gray-200 flex-wrap">
              <button
                onClick={() => setTab("information")}
                className={cn(
                  "relative px-8 py-3 text-sm font-medium transition-colors",
                  tab === "information" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Personal Info
                {tab === "information" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setTab("password")}
                className={cn(
                  "relative px-8 py-3 text-sm font-medium transition-colors",
                  tab === "password" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Password
                {tab === "password" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setTab("devices")}
                className={cn(
                  "relative px-8 py-3 text-sm font-medium transition-colors",
                  tab === "devices" ? "text-red-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Manage Access & Devices
                {tab === "devices" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="transition-all duration-300">
          {tab === "information" ? (
            <InformationTab onProfileLoad={setProfileData} />
          ) : tab === "password" ? (
            <PasswordTab />
          ) : (
            <ManageDevicesTab />
          )}
        </div>

        {tab === "information" && (
          <div className="mt-12">
            <div
              className={cn(
                "grid gap-4",
                lastUpdatedValue ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
              )}
            >
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500">Profile Completion</p>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full bg-gradient-to-r from-blue-500 to-blue-600",
                        getCompletionWidth(completion)
                      )}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-2">{completion}%</p>
                </div>
              </div>

              <div className={cn("rounded-xl p-4 border", statusMeta.bg, statusMeta.border)}>
                <p className="text-xs text-gray-500">Account Status</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn("h-2 w-2 rounded-full", statusMeta.dot)} />
                  <p className={cn("text-sm font-semibold", statusMeta.text)}>{statusMeta.label}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500">Member Since</p>
                <p className="text-sm font-semibold text-gray-900 mt-2">{memberSince}</p>
              </div>

              {lastUpdatedValue ? (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900 mt-2">{formatDate(lastUpdatedValue)}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}