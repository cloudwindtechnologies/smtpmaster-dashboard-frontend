"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";

const AUTH_LOCAL_STORAGE_KEYS = [
  "token",
  "role",
  "wheretogo",
  "userData",
  "filldata",
  "user_token",
  "superadmin_token",
  "superadmin_role",
  "admin_token_backup",
  "is_impersonating",
  "impersonated_user_id",
  "imp_user_id",
  "gmail",
];

const AUTH_SESSION_STORAGE_KEYS = [
  "tab_session",
  "is_impersonated",
  "impersonate_token",
  "impersonated_user_id",
  "onboarding_filldata",
  "auth_bootstrapping",
  "pending_redirect",
  "wheretogo",
  "TAB_ALIVE_SMTPMASTER",
];

const AUTH_COOKIE_NAMES = ["token", "role"];

function clearAuthCookie(name: string) {
  const domain = window.location.hostname;
  const expiredAt = "Expires=Thu, 01 Jan 1970 00:00:00 GMT";

  document.cookie = `${name}=; Path=/; ${expiredAt}; SameSite=Lax`;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;

  if (domain && domain !== "localhost") {
    document.cookie = `${name}=; Path=/; Domain=${domain}; ${expiredAt}; SameSite=Lax`;
    document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax`;
  }
}

function clearAuthCookies() {
  AUTH_COOKIE_NAMES.forEach((name) => clearAuthCookie(name));
}

function clearClientAuth() {
  AUTH_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  AUTH_SESSION_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
  clearAuthCookies();
}

async function logoutFromServer(token: string | null) {
  if (!token) return;

  await fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  }).catch(() => {});
}

export default function LogoutPage() {
  const router = useRouter();
  const { clearUser } = useUser();

  useEffect(() => {
    (async () => {
      const impersonateToken = sessionStorage.getItem("impersonate_token");
      const userToken = localStorage.getItem("user_token");
      const isImpersonated =
        sessionStorage.getItem("is_impersonated") === "true" ||
        Boolean(impersonateToken);
      const token =
        impersonateToken ||
        userToken ||
        localStorage.getItem("superadmin_token") ||
        localStorage.getItem("token");

      if (isImpersonated) {
        // ✅ IMPERSONATED USER LOGOUT - Only clear user session
        await logoutFromServer(impersonateToken || userToken);

        // Clear only user-related data
        localStorage.removeItem("user_token");
        localStorage.removeItem("role");
        localStorage.removeItem("wheretogo");
        localStorage.removeItem("userData");
        localStorage.removeItem("filldata");
        localStorage.removeItem("gmail");

        // Clear session storage - impersonated users need to clear all session keys
        AUTH_SESSION_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));

        clearUser();

        // Try to close tab, fallback to login
        window.close();
        setTimeout(() => router.replace("/login"), 1000);
      } else {
        // ✅ SUPERADMIN LOGOUT - Clear everything
        if (!token) {
          // Try to logout using httpOnly cookies (if authentication is stored there)
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }).catch(() => {});
        } else {
          // Call Next API with bearer token
          await logoutFromServer(token);
        }

        clearClientAuth();
        clearUser();
        window.location.replace("/login");
      }
    })();
  }, [router, clearUser]);

 return (
  <div className="relative min-h-screen flex items-center justify-center bg-[var(--page-bg)] overflow-hidden">

    {/* Ambient background */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute w-[420px] h-[420px] rounded-full blur-3xl opacity-30 bg-[var(--brand)] top-[-120px] left-[-120px]" />
      <div className="absolute w-[360px] h-[360px] rounded-full blur-3xl opacity-20 bg-[var(--violet)] bottom-[-120px] right-[-120px]" />
    </div>

    {/* Glass card */}
    <div className="relative z-10 backdrop-blur-xl bg-[var(--surface)]/70 border border-[var(--line-soft)] shadow-[var(--shadow-card)] rounded-2xl px-10 py-12 flex flex-col items-center gap-6">

      {/* Animation container */}
      <div className="relative w-24 h-24 flex items-center justify-center">

        {/* Plane */}
        <div className="absolute text-3xl animate-[planeMove_2.4s_ease-in-out_infinite]">
          ✈️
        </div>

        {/* Envelope */}
        <div className="absolute text-3xl opacity-0 animate-[envelopeReveal_2.4s_ease-in-out_infinite]">
          📩
        </div>

        {/* Soft ring */}
        <div className="absolute w-24 h-24 rounded-full border border-[var(--line-soft)] animate-ping opacity-40" />
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <p className="text-[var(--text-strong)] text-lg font-semibold tracking-tight">
          Logging you out
        </p>
        <p className="text-[var(--text-soft)] text-sm">
          Securing your session…
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-soft)] animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-soft)] animate-bounce [animation-delay:0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-soft)] animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>

    {/* Animations */}
    <style jsx>{`
      @keyframes planeMove {
        0% {
          transform: translateX(-40px) translateY(6px) rotate(-12deg);
          opacity: 1;
        }
        50% {
          transform: translateX(0px) translateY(0px) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateX(40px) translateY(-6px) rotate(12deg);
          opacity: 0;
        }
      }

      @keyframes envelopeReveal {
        0% {
          opacity: 0;
          transform: scale(0.85);
        }
        50% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
    `}</style>
  </div>
);
}
