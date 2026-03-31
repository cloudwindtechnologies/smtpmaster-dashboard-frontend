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
        // Determine what type of tab this is
        if (isUserTab()) {
          // This is a user tab
          setTabType('user');
          const userToken = localStorage.getItem(AUTH_KEYS.USER_TOKEN);
          
          if (!userToken) {
            // No user token, redirect to login
            router.push("/login");
            return;
          }
          
          setRole('user');
        
          } else {
          // This is a superadmin tab
          setTabType('superadmin');
          const superadminToken = localStorage.getItem(AUTH_KEYS.SUPERADMIN_TOKEN) || localStorage.getItem("token");
          const storedRole = localStorage.getItem("role");
          
          if (!superadminToken || !storedRole) {
            router.push("/login");
            return;
          }
          
          setRole(storedRole);
        }
    
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