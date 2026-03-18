"use client"
import Header from "@/components/app_component/common/header";
import SuperAdminSidebar from "@/components/app_component/common/super-admin-sidebar";
import ClientSpamReportPage from "@/components/app_component/super-admin/user-management/client-spam-report-component";


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
        <SuperAdminSidebar />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
           <ClientSpamReportPage/>
           
        </main>
      </div>
    </div>
  );
}
