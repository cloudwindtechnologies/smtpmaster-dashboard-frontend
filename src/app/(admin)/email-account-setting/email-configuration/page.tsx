"use client"
import Header from "@/components/app_component/common/header";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import SuperAdminDashboardPage from "@/components/app_component/super-admin/dashboard/SuperAdminDashboard";
import EmailConfigurationPage from "@/components/app_component/super-admin/email-account-setting/email-config";
import DashboardPage from "@/components/app_component/user/dashboard/dashboard_component";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) {
      router.push("/login");
      return;
    }

    setRole(role);
  }, []);

  return (
    <div className="bg-gray-100 lg:flex h-screen">
      <div className="hidden lg:block flex-none">
        {role =='superadmin' ?<SuperAdminSidebar />:<SidebarNav/> }
      </div>

      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
           <EmailConfigurationPage/>
           
        </main>
      </div>
    </div>
  );
}
