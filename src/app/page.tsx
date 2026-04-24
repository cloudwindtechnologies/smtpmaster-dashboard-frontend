"use client";
import Header from "@/components/app_component/common/header";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import SuperAdminDashboardPage from "@/components/app_component/super-admin/dashboard/SuperAdminDashboard";
import DashboardPage from "@/components/app_component/user/dashboard/dashboard_component";

import { useEffect } from "react";
import { canAccessAdminShell } from "@/lib/auth";
import { getRouteFromWhereToGo } from "@/lib/onboarding";
import { SessionInitializer } from "./user-session-loader";
import { useUser } from "@/app/context/UserContext";

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const canUseAdminShell = canAccessAdminShell(user?.login_user_role_id);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;

    const cleanImpersonationUrl = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("impersonate")) return;

      url.searchParams.delete("impersonate");
      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    };

    const applyImpersonationPayload = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return false;

      const data = payload as {
        token?: unknown;
        timestamp?: unknown;
        wheretogo?: unknown;
      };
      const token = typeof data.token === "string" ? data.token : "";
      const timestamp =
        typeof data.timestamp === "number"
          ? data.timestamp
          : Number(data.timestamp);

      if (
        !token ||
        !Number.isFinite(timestamp) ||
        Date.now() - timestamp >= 10000
      ) {
        return false;
      }

      if (sessionStorage.getItem("impersonate_token") === token) {
        cleanImpersonationUrl();
        return false;
      }

      sessionStorage.setItem("impersonate_token", token);
      sessionStorage.setItem("tab_session", "user");

      const wheretogo =
        typeof data.wheretogo === "string" ? data.wheretogo.trim() : "";

      if (wheretogo) {
        sessionStorage.setItem("wheretogo", wheretogo);
      } else {
        sessionStorage.removeItem("wheretogo");
      }

      window.dispatchEvent(new Event("user-login"));
      cleanImpersonationUrl();

      // const onboardingRoute = getRouteFromWhereToGo(wheretogo);
      // if (onboardingRoute !== "/" && window.location.pathname !== onboardingRoute) {
      //   window.location.replace(onboardingRoute);
      // }

      return true;
    };

    // BroadcastChannel path for the impersonation popup handoff.
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("impersonate_channel");
      bc.onmessage = (event) => {
        applyImpersonationPayload(event.data);
      };
    }

    // URL fallback for browsers where BroadcastChannel is unavailable.
    const processUrlFallback = () => {
      const params = new URLSearchParams(window.location.search);
      const impersonateParam = params.get("impersonate");

      if (!impersonateParam) return;

      if (sessionStorage.getItem("impersonate_token")) {
        cleanImpersonationUrl();
        return;
      }

      try {
        applyImpersonationPayload(JSON.parse(atob(impersonateParam)));
      } catch {
        console.error("Invalid impersonate data");
        cleanImpersonationUrl();
      }
    };

    const fallbackTimer = window.setTimeout(processUrlFallback, 0);

    return () => {
      window.clearTimeout(fallbackTimer);
      bc?.close();
    };
  }, []);

  // Show loading while user data is being fetched
  if (userLoading || !user) {
    return (
      <SessionInitializer>
        <div className="bg-gray-100 lg:flex h-screen">
          <div className="hidden lg:block flex-none" />
          <div className="flex-1 overflow-y-auto">
            <Header />
            <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
              <div className="text-center flex flex-col items-center gap-3 text-sm text-gray-500">
                <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-[#ff7800] animate-spin" />
                <span>Loading...</span>
              </div>
            </main>
          </div>
        </div>
      </SessionInitializer>
    );
  }

  return (
    <SessionInitializer>
      <div className="bg-gray-100 lg:flex h-screen">
        <div className="hidden lg:block flex-none">
          {/* Show SuperAdminSidebar only for admin shell roles */}
          {canUseAdminShell ? <SuperAdminSidebar /> : <SidebarNav />}
        </div>

        <div className="flex-1 overflow-y-auto">
          <Header />
          <main className="flex-1 p-4 lg:p-6">
            {canUseAdminShell ? <SuperAdminDashboardPage /> : <DashboardPage />}
          </main>
        </div>
      </div>
    </SessionInitializer>
  );
}
