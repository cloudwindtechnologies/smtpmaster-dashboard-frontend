"use client";

import Header from "@/components/app_component/common/header";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import SuperAdminEmailLogsPage from "@/components/app_component/super-admin/email-logs/SuperAdminEmailLogs";
import EmailLogs from "@/components/app_component/user/email-logs/email-logs";
import { useUser } from "@/app/context/UserContext";
import { canAccessAdminShell } from "@/lib/auth";

export default function EmailLogsPage() {
  const { user } = useUser();
  const isAdmin = canAccessAdminShell(user?.login_user_role_id);

  return (
    <div className="bg-gray-100 lg:flex h-screen">
      <div className="hidden lg:block flex-none">
        {isAdmin ? <SuperAdminSidebar /> : <SidebarNav />}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          {isAdmin ? <SuperAdminEmailLogsPage /> : <EmailLogs />}
        </main>
      </div>
    </div>
  );
}
