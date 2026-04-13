"use client";

import { token } from "@/components/app_component/common/http";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type User = {
  login_user_id: number;
  login_user_first_name: string;
  login_user_last_name: string;
  login_user_image: string | null;
  login_user_email: string;
  login_user_mobile: string | null;
  login_user_role_id: string;
  login_user_vmta_pool_id: string | null;
  login_user_date_time: string;
  status: string;
  country: string | null;
  address: string | null;
  zipcode: string | null;
  city: string | null;
  website: string | null;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  startLoading: () => void;
  clearUser: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);
const PUBLIC_USER_ROUTES = ["/login", "/signup", "/forgot-password", "/forgot_password", "/unauthorized"];

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_token");
  localStorage.removeItem("superadmin_token");
  localStorage.removeItem("superadmin_role");
  localStorage.removeItem("admin_token_backup");
  localStorage.removeItem("is_impersonating");
  localStorage.removeItem("impersonated_user_id");
  localStorage.removeItem("imp_user_id");
  localStorage.removeItem("wheretogo");

  sessionStorage.removeItem("auth_bootstrapping");
  sessionStorage.removeItem("tab_session");
  sessionStorage.removeItem("impersonate_token");
  sessionStorage.removeItem("is_impersonated");
  sessionStorage.removeItem("impersonated_user_id");
  sessionStorage.removeItem("wheretogo");
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute =
    PUBLIC_USER_ROUTES.includes(pathname) ||
    pathname.startsWith("/signup/");

  const startLoading = () => {
    setLoading(true);
    setUser(null);
  };

  const clearUser = () => {
    setUser(null);
    setLoading(false);
  };

  const logoutInvalidSession = useCallback(async () => {
    clearStoredAuth();
    setUser(null);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to clear invalid session", error);
    }

    if (!isPublicRoute) {
      router.replace("/login?error=invalid_session");
    }
  }, [isPublicRoute, router]);

  const fetchUser = useCallback(async () => {
    const authToken = token();

    setLoading(true);

    try {
      const res = await fetch("/api/auth/profileMe", {
        credentials: "include",
        headers: authToken
          ? {
              Authorization: `Bearer ${authToken}`,
            }
          : {},
      });

      if (!res.ok) {
        const bootstrapping = sessionStorage.getItem("auth_bootstrapping") === "1";

        if (bootstrapping) {
          await new Promise((resolve) => setTimeout(resolve, 250));

          const retryRes = await fetch("/api/auth/profileMe", {
            credentials: "include",
            headers: authToken
              ? {
                  Authorization: `Bearer ${authToken}`,
                }
              : {},
          });

          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData?.data) {
              sessionStorage.removeItem("auth_bootstrapping");
              setUser(retryData.data);
              return;
            }
          }
        }

        await logoutInvalidSession();
        return;
      }

      const data = await res.json();
      sessionStorage.removeItem("auth_bootstrapping");

      if (!data?.data) {
        await logoutInvalidSession();
        return;
      }

      setUser(data.data);
    } catch (err) {
      console.error("Failed to load user", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [logoutInvalidSession]);

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    fetchUser();

    const handleUserLogin = () => {
      fetchUser();
    };

    window.addEventListener("user-login", handleUserLogin);

    return () => {
      window.removeEventListener("user-login", handleUserLogin);
    };
  }, [fetchUser, isPublicRoute]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refreshUser: fetchUser,
        startLoading,
        clearUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
};
