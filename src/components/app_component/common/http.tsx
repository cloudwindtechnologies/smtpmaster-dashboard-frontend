// export const apiURL="http://localhost:8000";

// export const token=()=>{

//    if (typeof window === "undefined") {
//     return null; // server side
//   }

//   const role = localStorage.getItem("role");

//   if (role === "user") {
//     return localStorage.getItem("user_token");
//   }
//    return localStorage.getItem('token');
    
// }

// components/app_component/common/http.ts
// components/app_component/common/http.ts
// components/app_component/common/http.ts
import { getToken as getAuthToken } from '@/lib/auth';

const envBackendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://bak.way2inboxs.com";


export const apiURL = 'https://bak.way2inboxs.com';

export const token = (): string | null => {
  return getAuthToken(); // Use the tab-aware token function
};

// For superadmin operations from any tab
export const getSuperadminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return  localStorage.getItem('token');
};
