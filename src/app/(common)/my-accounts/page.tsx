"use client";

import Header from "@/components/app_component/common/header";
import SidebarNav from "@/components/app_component/common/sidebar";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import MyAccount from "@/components/app_component/user/my-account/change-password-component";
import { useUser } from "@/app/context/UserContext";
import { canAccessAdminShell } from "@/lib/auth";

export default function Page() {
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
          <MyAccount />
        </main>
      </div>
    </div>
  );
}
