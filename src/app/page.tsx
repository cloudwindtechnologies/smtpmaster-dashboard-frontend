"use client";
import Header from "@/components/app_component/common/header";
import { token } from "@/components/app_component/common/http";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import SuperAdminDashboardPage from "@/components/app_component/super-admin/dashboard/SuperAdminDashboard";
import DashboardPage from "@/components/app_component/user/dashboard/dashboard_component";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSuperadminTab, isUserTab, getToken, AUTH_KEYS } from "@/lib/auth";
import { SessionInitializer } from "./user-session-loader";
import { useUser } from "@/app/context/UserContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [tabType, setTabType] = useState<'superadmin' | 'user'>('superadmin');
  const [sessionChecked, setSessionChecked] = useState(false);
  const { loading: userLoading } = useUser();

  // useEffect(() => {
  //   const checkSession = () => {
  //     const userToken = localStorage.getItem(AUTH_KEYS.USER_TOKEN);
  //     const superadminToken =
  //       localStorage.getItem(AUTH_KEYS.SUPERADMIN_TOKEN) ||
  //       localStorage.getItem("token");
  //     const storedRole = localStorage.getItem("role");

  //     if (userToken) {
  //       setTabType("user");
  //       setRole("user");
  //     } else if (superadminToken && storedRole) {
  //       setTabType("superadmin");
  //       setRole(storedRole);
  //     } else {
  //       console.log('logout in home page ');
        
  //       router.push("/login");
  //     }
  //   };

  //   // Check immediately
  //   checkSession();

  //   // Also check after a short delay to catch any async storage updates
  //   const timer = setTimeout(checkSession, 100);

  //   return () => clearTimeout(timer);
  // }, [router, sessionChecked]);
    useEffect(() => {
      const timer = setTimeout(() => {
      // Determine what type of tab this is
      if (isUserTab()) {
        setTabType('user');
        const userToken = localStorage.getItem(AUTH_KEYS.USER_TOKEN);
        
        if (!userToken) {
          router.push("/login");
          return;
        }
        setRole('user');
      } else {
        setTabType('superadmin');
        const superadminToken = localStorage.getItem(AUTH_KEYS.SUPERADMIN_TOKEN) || localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        if (!superadminToken || !storedRole) {
          router.push("/login");
          return;
        }
        setRole(storedRole);
      }
    }, 100);

    // Cleanup the timer if the component unmounts
    return () => clearTimeout(timer);
    }, [router]);


  // Show loading while user data is being fetched
  if (userLoading) {
    return (
      <SessionInitializer>
        <div className="bg-gray-100 lg:flex h-screen">
          <div className="hidden lg:block flex-none">
            {role === 'superadmin' ? <SuperAdminSidebar /> : <SidebarNav />}
          </div>
          <div className="flex-1 overflow-y-auto">
            <Header />
            <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
              <div className="text-center">
                
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
          {/* Show SuperAdminSidebar only for superadmin role */}
          {role === 'superadmin' ? <SuperAdminSidebar /> : <SidebarNav />}
        </div>

        <div className="flex-1 overflow-y-auto">
          <Header />
          <main className="flex-1 p-4 lg:p-6">
            {role === 'superadmin' ? <SuperAdminDashboardPage /> : <DashboardPage />}
          </main>
        </div>
      </div>
    </SessionInitializer>
  );
}