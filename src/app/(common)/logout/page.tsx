"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";

export default function LogoutPage() {
  const router = useRouter();
  const { clearUser } = useUser();

  useEffect(() => {
    (async () => {
      const isImpersonated = sessionStorage.getItem("is_impersonated") === "true";
      const token = localStorage.getItem("token");

      if (isImpersonated) {
        // ✅ IMPERSONATED USER LOGOUT - Only clear user session
        const userToken = localStorage.getItem("user_token");
        if (userToken) {
          await fetch("/api/auth/logout", {
            method: "GET",
            headers: {
              authorization: `Bearer ${userToken}`,
            },
          }).catch(() => {});
        }

        // Clear only user-related data
        localStorage.removeItem("user_token");
        localStorage.removeItem("role");
        localStorage.removeItem("wheretogo");
        localStorage.removeItem("userData");
        localStorage.removeItem("filldata");
        localStorage.removeItem("gmail");

        // Clear session storage
        sessionStorage.removeItem("tab_session");
        sessionStorage.removeItem("is_impersonated");
        sessionStorage.removeItem("onboarding_filldata");

        clearUser();

        // Try to close tab, fallback to login
        window.close();
        setTimeout(() => router.replace("/login"), 1000);
      } else {
        // ✅ SUPERADMIN LOGOUT - Clear everything
        if (!token) {
          localStorage.removeItem("role");
          clearUser();
          router.replace("/login");
          return;
        }

        // Call Next API (not Laravel directly)
        await fetch("/api/auth/logout", {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
          },
        }).catch(() => {});

        // // Clear cookies
        // document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
        // document.cookie = "role=; Path=/; Max-Age=0; SameSite=Lax";
        // Delete with same path and domain
      const domain = window.location.hostname;
     document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();

      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; Path=/; Max-Age=0`;

      // for localhost domain
      document.cookie = `${name}=; Path=/; Domain=${domain}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });


        // Clear ALL client storage
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("wheretogo");
        localStorage.removeItem("userData");
        localStorage.removeItem("filldata");
        localStorage.removeItem("user_token");
        localStorage.removeItem("superadmin_token");
        localStorage.removeItem("superadmin_role");
        localStorage.removeItem("admin_token_backup");
        localStorage.removeItem("is_impersonating");
        localStorage.removeItem("impersonated_user_id");
        localStorage.removeItem("gmail");

        // Clear session storage
        sessionStorage.removeItem("tab_session");
        sessionStorage.removeItem("is_impersonated");
        sessionStorage.removeItem("onboarding_filldata");

        clearUser();

        router.replace("/login");
      }
    })();
  }, [router, clearUser]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Logging out...
    </div>
  );
}
