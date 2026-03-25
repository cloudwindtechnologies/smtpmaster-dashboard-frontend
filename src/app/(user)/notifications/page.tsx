"use client"
import Header from "@/components/app_component/common/header";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import NotificationsComponent from "@/components/app_component/user/notifications/notifications-component";

export default function Home() {
  

  return (
    <div className="bg-gray-100 lg:flex h-screen">
      <div className="hidden lg:block flex-none">
        <SuperAdminSidebar />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          <NotificationsComponent/>
           
        </main>
      </div>
    </div>
  );
}
