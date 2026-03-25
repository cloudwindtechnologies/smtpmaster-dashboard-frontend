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
import MobileSidebar from "./monile-sidebar";
import { useUser } from "@/app/context/UserContext";
import toast from "react-hot-toast";

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
  // ✅ remove impersonation localStorage keys
  localStorage.removeItem("user_token");
  localStorage.removeItem("is_impersonating");
  localStorage.removeItem("impersonated_user_id");
  localStorage.removeItem("imp_user_id");

  // ✅ remove impersonation sessionStorage keys
  sessionStorage.removeItem("tab_session");
  sessionStorage.removeItem("is_impersonated");
  sessionStorage.removeItem("onboarding_filldata");

  // ✅ remove tab marker too
  sessionStorage.removeItem(TAB_ALIVE_KEY);
};

export default function Header() {
  const [role, setRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tabType, setTabType] = useState<"superadmin" | "user">("superadmin");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, loading } = useUser();


  const username =
    user?.login_user_first_name && user?.login_user_last_name
      ? `${user.login_user_first_name} ${user.login_user_last_name}`
      : user?.login_user_first_name || user?.login_user_last_name || null;

  const initials = getInitials(username);
  const avatarColor = getAvatarColor(username);

  // ✅ STEP A: On first mount, cleanup impersonation if tab was CLOSED (not reload)
  useEffect(() => {
    const wasImpersonating =
      localStorage.getItem("is_impersonating") === "1" ||
      !!localStorage.getItem("user_token") ||
      !!localStorage.getItem("impersonated_user_id");

    const tabAlive = sessionStorage.getItem(TAB_ALIVE_KEY) === "1";

    // If impersonation exists in localStorage but no tab marker -> previous tab closed
    if (wasImpersonating && !tabAlive) {
      clearImpersonationEverywhere();
    }

    // Mark this tab alive (reload keeps sessionStorage, close clears it)
    sessionStorage.setItem(TAB_ALIVE_KEY, "1");
  }, []);

  // Role + tabType detection
  useEffect(() => {
    const roleData = localStorage.getItem("role");
    setRole(roleData);

    checkTabType();

    // storage event only triggers in other tabs, still ok
    const handleStorageChange = () => checkTabType();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const checkTabType = () => {
    const userToken = localStorage.getItem("user_token");
    const isImp = sessionStorage.getItem("is_impersonated") === "true";

    if (userToken || isImp) setTabType("user");
    else setTabType("superadmin");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Exit impersonation by button click
  const handleExitImpersonation = (e: React.MouseEvent) => {
    e.preventDefault();

    const adminToken =
      localStorage.getItem("superadmin_token") ||
      localStorage.getItem("admin_token_backup") ||
      localStorage.getItem("token");

    clearImpersonationEverywhere();

    if (adminToken) {
      localStorage.setItem("token", adminToken);
      localStorage.setItem("role", "superadmin");
    }

    setTabType("superadmin");
    toast.success("Exited impersonation mode");
    router.push("/");
    location.reload(); // you can remove this later if you want
  };

  const handleLogout = () => {
    clearImpersonationEverywhere();

    toast.success("Logged out successfully");
    router.push("/logout");
  };

  // Loading State
  if (loading) {
    return (
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          {role === "superadmin" ? <SuperAdminMobileSidebar /> : <MobileSidebar />}
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
      {/* Impersonation Banner */}
      {tabType === "user" && sessionStorage.getItem("is_impersonated") === "true" && (
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
        <div className="flex items-center gap-4">
          {role === "superadmin" ? <SuperAdminMobileSidebar /> : <MobileSidebar />}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link href='/notifications' className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
          </Link>

          <span className="hidden sm:block text-sm font-medium text-foreground">
            Hi, {username || "Guest"}
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
                  {tabType === "user" && sessionStorage.getItem("is_impersonated") === "true" && (
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
                    href="/my-accounts"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>

                  <div className="h-px bg-border my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}