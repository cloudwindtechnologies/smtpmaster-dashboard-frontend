"use client";

import Header from '@/components/app_component/common/header'
import SidebarNav from '@/components/app_component/common/sidebar'
import SuperAdminSidebar from '@/components/app_component/common/super-admin-sidebar';
import ChangePassword from '@/components/app_component/user/my-account/change-password-component'
import { AUTH_KEYS, isUserTab } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';


export default function Page() {
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
     <div className=" bg-gray-100 lg:flex h-screen ">
         {/* Sidebar: hidden on mobile, shown on desktop */}
            <div className="hidden lg:block flex-none">
                {role === "superadmin" ? <SuperAdminSidebar /> : <SidebarNav />}
              </div>
   
         {/* Main content */}
         <div className="flex-1 overflow-y-auto">
           <Header/>
           
           <main className="flex-1 p-4 lg:p-6">
           <ChangePassword/>
         </main>
         </div>
         
       </div>
  )
}
