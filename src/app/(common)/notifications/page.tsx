"use client";

import Header from "@/components/app_component/common/header";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import NotificationsComponent from "@/components/app_component/user/notifications/notifications-component";
import { useUser } from "@/app/context/UserContext";
import { isSuperadminRole } from "@/lib/auth";

export default function NotificationsPage() {
  const { user } = useUser();
  const isAdmin = isSuperadminRole(user?.login_user_role_id);

  return (
    <div className="bg-gray-100 lg:flex h-screen">
      <div className="hidden lg:block flex-none">
        {isAdmin ? <SuperAdminSidebar /> : <SidebarNav />}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          <NotificationsComponent />
        </main>
      </div>
    </div>
  );
}
