// // app/user-session-loader.tsx
// "use client";
// import { useEffect } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { setUserSessionInCurrentTab, setTabSession } from '@/lib/auth';

// export function SessionInitializer({ children }: { children: React.ReactNode }) {
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   useEffect(() => {
//     // Check if this tab was opened with session data
//     const sessionParam = searchParams.get('session');
    
//     if (sessionParam) {
//       try {
//         // Decode session data
//         const sessionData = JSON.parse(atob(sessionParam));
        
//         if (sessionData.type === 'user') {
//           // This is a user tab - initialize it properly
//           const userToken = localStorage.getItem('user_token');
//           if (userToken) {
//             setUserSessionInCurrentTab(userToken);
//           }
          
//           // Mark this tab as impersonated by admin
//           sessionStorage.setItem('is_impersonated', 'true');
          
//           // Store filldata if needed
//           if (sessionData.filldata && Object.keys(sessionData.filldata).length > 0) {
//             sessionStorage.setItem('onboarding_filldata', JSON.stringify(sessionData.filldata));
//           }
          
//           // Clean URL (remove the session param)
//           const url = new URL(window.location.href);
//           url.searchParams.delete('session');
//           window.history.replaceState({}, '', url.toString());
//         }
//       } catch (e) {
//         console.error('Failed to initialize session', e);
//       }
//     } else {
//       // No session param - check if this is a regular user login
//       const userToken = localStorage.getItem('user_token');
//       const role = localStorage.getItem('role');
      
//       // If this is a user page (not super-admin) and has user_token, set as user tab
//       const isUserPage = !window.location.pathname.includes('/super-admin') && 
//                          !window.location.pathname.includes('/admin');
      
//       // treat anything other than a superadmin role as a user
//       if (isUserPage && userToken && role !== 'superadmin') {
//         setTabSession('user');
//       }
//     }
//   }, [searchParams]);

//   return <>{children}</>;
// }

"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeRole, setUserSessionInCurrentTab, setTabSession } from "@/lib/auth";

function SessionInitInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionParam = searchParams.get("session");

    if (sessionParam) {
      try {
        const sessionData = JSON.parse(atob(sessionParam));

        if (sessionData.type === "user") {
          const userToken = localStorage.getItem("user_token");

          if (userToken) {
            setUserSessionInCurrentTab(userToken);
          }

          sessionStorage.setItem("is_impersonated", "true");

          if (sessionData.filldata && Object.keys(sessionData.filldata).length > 0) {
            sessionStorage.setItem(
              "onboarding_filldata",
              JSON.stringify(sessionData.filldata)
            );
          }

          const url = new URL(window.location.href);
          url.searchParams.delete("session");
          window.history.replaceState({}, "", url.toString());
        }
      } catch (e) {
        console.error("Failed to initialize session", e);
      }
    } else {
      const userToken = localStorage.getItem("user_token");
      const role = normalizeRole(localStorage.getItem("role"));

      const isUserPage =
        !window.location.pathname.includes("/super-admin") &&
        !window.location.pathname.includes("/admin");

      if (isUserPage && userToken && role !== "superadmin") {
        setTabSession("user");
      }
    }
  }, [searchParams]);

  return null;
}

export function SessionInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <SessionInitInner />
      </Suspense>
      {children}
    </>
  );
}
