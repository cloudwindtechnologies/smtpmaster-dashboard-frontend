import Header from '@/components/app_component/common/header'
import SidebarNav from '@/components/app_component/common/sidebar'
import PackageInfo from '@/components/app_component/user/package-info/package-info_component'

export default function Page() {
  return (
     <div className=" bg-gray-100 lg:flex h-screen ">
         {/* Sidebar: hidden on mobile, shown on desktop */}
         <div className="hidden lg:block flex-none">
           <SidebarNav />
         </div>
   
         {/* Main content */}
         <div className="flex-1 overflow-y-auto">
           <Header/>
           <div className="flex-1 p-4 lg:p-6">
           <PackageInfo/>
         </div>
         </div>
         
       </div>
  )
}
