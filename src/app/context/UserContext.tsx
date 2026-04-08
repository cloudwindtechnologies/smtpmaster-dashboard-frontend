"use client";

import { token } from "@/components/app_component/common/http";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";

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

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ["/login", "/signup", "/forgot-password"];
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/signup/");

  const startLoading = () => {
    setLoading(true);
    setUser(null);
  };

  const clearUser = () => {
    setUser(null);
    setLoading(false);
  };

  const fetchUser = async () => {
    const authToken = token();

    if (!authToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/profileMe", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        setUser(null);

        // only redirect on protected pages
        if (!isPublicRoute) {
          router.push("/login");
        }
        return;
      }

      const data = await res.json();
      setUser(data.data ?? null);
    } catch (err) {
      console.error("Failed to load user", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
  }, [pathname]);

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