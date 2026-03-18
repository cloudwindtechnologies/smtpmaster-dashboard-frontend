"use client"

import Header from "@/components/app_component/common/header"
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar"
import CouponsPage from "@/components/app_component/super-admin/Cupons/CuponController"
import NotFound from "@/app/not-found" // ✅ adjust if your NotFound path is different

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Home() {
  const router = useRouter()

  // ✅ auth gate to stop 1-2 sec flash
  const [authReady, setAuthReady] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    // run only on client
    const t = localStorage.getItem("token")
    const r = localStorage.getItem("role")

    if (!t || !r) {
      router.replace("/login") // ✅ replace = no back navigation
      return
    }

    setRole(r)
    setAuthReady(true)
  }, [router])

  // ✅ show loader (or return null) until auth check finishes
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white shadow">
          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
          <div>
            <div className="text-sm font-semibold text-gray-800">Checking session…</div>
            <div className="text-xs text-gray-500">Redirecting if needed</div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ IMPORTANT: localStorage returns string, so compare with "1"
  const isSuperAdmin = role !== "1"

  if (!isSuperAdmin) {
    return <NotFound />
  }

  return (
    <div className="bg-gray-100 lg:flex h-screen">
      <div className="hidden lg:block flex-none">
        <SuperAdminSidebar />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          <CouponsPage />
        </main>
      </div>
    </div>
  )
}
