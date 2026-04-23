"use client";

import {
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SuperAdminMobileSidebar from "./superAdminMobile";
import MobileSidebar from "./mobile-sidebar";
import { useUser } from "@/app/context/UserContext";
import toast from "react-hot-toast";
import { AUTH_KEYS, canAccessAdminShell } from "@/lib/auth";

// ===== Helpers =====
const getInitials = (name: string | null): string => {
  if (!name) return "G";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name: string | null): string => {
  if (!name) return "bg-gray-500";
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
    "bg-rose-500"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ===== Keys =====
const TAB_ALIVE_KEY = "TAB_ALIVE_SMTPMASTER"; // unique name

const clearImpersonationEverywhere = () => {
  // localStorage cleanup
  localStorage.removeItem("user_token");
  localStorage.removeItem("is_impersonating");
  localStorage.removeItem("impersonated_user_id");
  localStorage.removeItem("imp_user_id");

  // ✅ sessionStorage cleanup - add these
  sessionStorage.removeItem("tab_session");
  sessionStorage.removeItem("is_impersonated");
  sessionStorage.removeItem("impersonate_token"); // <-- ADD THIS
  sessionStorage.removeItem("impersonated_user_id"); // <-- ADD THIS
  sessionStorage.removeItem("onboarding_filldata");
  sessionStorage.removeItem("wheretogo");

  // tab marker
  sessionStorage.removeItem(TAB_ALIVE_KEY);
};

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false); // ✅ Add this

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, loading } = useUser();
  const canUseAdminShell = canAccessAdminShell(user?.login_user_role_id);
  const handleExitImpersonation = (e: React.MouseEvent) => {
  e.preventDefault();

  // Save admin token before clearing everything
  const adminToken =
    localStorage.getItem("superadmin_token") ||
    localStorage.getItem("token");

  // Clear impersonation data
  sessionStorage.removeItem("impersonate_token");
  sessionStorage.removeItem("is_impersonated");
  sessionStorage.removeItem("tab_session");
  sessionStorage.removeItem("impersonated_user_id");
  localStorage.removeItem("user_token");
  localStorage.removeItem("is_impersonating");

  // Restore admin session
  if (adminToken) {
    localStorage.setItem(AUTH_KEYS.SUPERADMIN_TOKEN, adminToken);
    localStorage.setItem("token", adminToken);
    localStorage.setItem(AUTH_KEYS.SUPERADMIN_ROLE, "superadmin");
    localStorage.setItem("role", "superadmin");
  }

  setIsImpersonating(false);
  toast.success("Exited impersonation mode");
  
  // Hard reload to clear all React state
  router.push("/");
  window.location.reload();
};

  const username =
    user?.login_user_first_name && user?.login_user_last_name
      ? `${user.login_user_first_name} ${user.login_user_last_name}`
      : user?.login_user_first_name || user?.login_user_last_name || null;

  const initials = getInitials(username);
  const avatarColor = getAvatarColor(username);

  // ✅ STEP A: Cleanup on mount
  useEffect(() => {
    const wasImpersonating =
      localStorage.getItem("is_impersonating") === "1" ||
      !!localStorage.getItem("impersonated_user_id");

    const tabAlive = sessionStorage.getItem(TAB_ALIVE_KEY) === "1";

    if (wasImpersonating && !tabAlive) {
      clearImpersonationEverywhere();
    }

    sessionStorage.setItem(TAB_ALIVE_KEY, "1");
  }, []);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  // ✅ Role + tabType detection (CLIENT-SIDE ONLY)
  useEffect(() => {
    checkTabType();

    const handleStorageChange = () => checkTabType();
    window.addEventListener("storage", handleStorageChange);
    
    // ✅ Check every 300ms for first 2 seconds to catch page.tsx initialization
    let count = 0;
    const interval = setInterval(() => {
      checkTabType();
      count++;
      if (count > 6) clearInterval(interval);
    }, 300);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const checkTabType = () => {
    if (typeof window === 'undefined') return; // ✅ SSR safety
    
    const impersonateToken = sessionStorage.getItem('impersonate_token');
    const isImp = sessionStorage.getItem('is_impersonated') === 'true';
    
    
    setIsImpersonating(!!(impersonateToken || isImp)); // ✅ Update impersonation state
  };

  // ... rest of your code (keep handleExitImpersonation, handleLogout, etc.)

  if (loading) {
    return (
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          {canUseAdminShell ? <SuperAdminMobileSidebar /> : <MobileSidebar />}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          <div className="hidden sm:block h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <>
      {/* ✅ Use state variable instead of direct sessionStorage access */}
      {isImpersonating && (
        <div className="bg-yellow-100 border-b border-yellow-300 py-2 px-4 sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-center">
            <span className="text-sm px-2 py-1 mx-auto rounded bg-green-500 text-white">
              👤 You are impersonating the customer. Please{" "}
              <button onClick={handleExitImpersonation} className="font-bold text-blue-800 underline">
                click here
              </button>{" "}
              to exit.
            </span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-40">
        {/* ... keep rest of your header code exactly the same ... */}
        <div className="flex items-center gap-4">
          {canUseAdminShell ? <SuperAdminMobileSidebar /> : <MobileSidebar />}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link href='/notifications' className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
          </Link>

          <span className="hidden sm:block text-sm font-medium text-foreground">
            {loading ? (<div className="h-4 w-24 bg-muted animate-pulse" />) : `Hi, ${username || "Guest"}`}
          </span>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className={`h-9 w-9 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm ring-2 ring-offset-2 ring-offset-card ring-transparent hover:ring-muted transition-all`}>
                {initials}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-foreground">{username || "Guest"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.login_user_email || "Loading..."}
                  </p>
                </div>

                <div className="p-1">
                  {/* ✅ Use state here too */}
                  {isImpersonating && (
                    <>
                      <button
                        onClick={handleExitImpersonation}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-yellow-700 hover:bg-yellow-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Exit Impersonation
                      </button>
                      <div className="h-px bg-border my-1" />
                    </>
                  )}

                  <Link
                    href="/my-accounts"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    My Account
                  </Link>

                  <Link
                    href="/email-config"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>

                  <div className="h-px bg-border my-1" />

                  <Link
                    href='/logout'
                    prefetch={false}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
