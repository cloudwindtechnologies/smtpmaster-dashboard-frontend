import Header from '@/components/app_component/common/header'
import SidebarNav from '@/components/app_component/common/sidebar'
import UserInfo from '@/components/app_component/user/domain-info/domain-info-component'


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
           <main className="flex-1 p-4 lg:p-6">
           <UserInfo/>
         </main>
         </div>
         
       </div>
  )
}
