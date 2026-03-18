"use client";

import { token } from "@/components/app_component/common/http";
import { useRouter } from "next/navigation";
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
  clearUser: () => void; // ✅ new
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const route = useRouter();

  const startLoading = () => {
    setLoading(true);
    setUser(null); // ✅ important: remove old username immediately
  };

  const clearUser = () => {
    setUser(null);
    setLoading(false);
  };

  const fetchUser = async () => {
    setLoading(true); // ✅ always show loading during refetch
    try {
      const res = await fetch("/api/auth/profileMe", {
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });

   

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
    fetchUser();

    // Listen for login events to refresh user data
    const handleUserLogin = () => {
      fetchUser();
    };

    window.addEventListener('user-login', handleUserLogin);

    return () => {
      window.removeEventListener('user-login', handleUserLogin);
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUser, startLoading, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
};