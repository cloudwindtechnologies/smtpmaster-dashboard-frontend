"use client";

import Header from "@/components/app_component/common/header";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isUserTab, AUTH_KEYS } from "@/lib/auth"; // 👈 Import auth helpers
import NotificationsComponent from "@/components/app_component/user/notifications/notifications-component";


export default function EmailLogsPage() {
  const router = useRouter();
    
    const [role, setRole] = useState<string | null>(null);
    const [tabType, setTabType] = useState<'superadmin' | 'user'>('superadmin');
   
  
useEffect(() => {
  let bc: BroadcastChannel | null = null;
  let tokenReceived = false;

  // ✅ METHOD 1: Listen for BroadcastChannel (fastest, production preferred)
  if ('BroadcastChannel' in window) {
    bc = new BroadcastChannel('impersonate_channel');
    bc.onmessage = (event) => {
      const data = event.data;
      if (data?.token && Date.now() - data.timestamp < 10000) { // 10s expiry
        sessionStorage.setItem('impersonate_token', data.token);
        sessionStorage.setItem('tab_session', 'user');
        if (data.wheretogo) sessionStorage.setItem('wheretogo', data.wheretogo);
        tokenReceived = true;
        
        // Clean URL if fallback was also present
        if (window.location.search.includes('impersonate=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };
  }

  // ✅ METHOD 2: URL Fallback (for BC unsupported browsers)
  const params = new URLSearchParams(window.location.search);
  const impersonateParam = params.get('impersonate');
  
  if (!tokenReceived && impersonateParam) {
    try {
      const data = JSON.parse(atob(impersonateParam));
      if (Date.now() - data.timestamp < 10000) { // 10s expiry check
        sessionStorage.setItem('impersonate_token', data.token);
        sessionStorage.setItem('tab_session', 'user');
        window.history.replaceState({}, '', window.location.pathname); // Clean URL immediately
      }
    } catch (e) {
      console.error('Invalid impersonate data');
    }
  }

  // Determine tab type
  const timer = setTimeout(() => {
    if (isUserTab()) {
      setTabType('user');
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
  }, 50); // Reduced delay since BC is instant

  return () => {
    clearTimeout(timer);
    bc?.close();
  };
}, [router]);




  return (
    <div className="bg-gray-100 lg:flex h-screen">
      {/* Sidebar */}
      <div className="hidden lg:block flex-none">
        {role === "superadmin" ? <SuperAdminSidebar /> : <SidebarNav />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
         <NotificationsComponent/>
        </main>
      </div>
    </div>
  );
}