"use client"
import Header from '@/components/app_component/common/header'
import SidebarNav from '@/components/app_component/common/sidebar'
import PackageDetailsPage from '@/components/app_component/user/packages/invoice/user-invoice'
import AllPakagesComponent from '@/components/app_component/user/packages/packages_comonent'
import { useParams } from 'next/navigation'

export default function Page() {
  const {id}=useParams()
  return (
     <div className=" bg-gray-100 lg:flex h-screen ">
         {/* Sidebar: hidden on mobile, shown on desktop */}
         <div className="hidden lg:block flex-none">
           <SidebarNav />
         </div>
   
         {/* Main content */}
         <div className="flex-1 overflow-y-auto">
           <Header/>
           <main className="flex-1 p-4 lg:p-6">
           <PackageDetailsPage/>
         </main>
         </div>
         
       </div>
  )
}
