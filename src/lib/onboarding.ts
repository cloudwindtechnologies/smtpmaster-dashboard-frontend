import { AUTH_KEYS, getToken, setTabSession } from "@/lib/auth";

export type OnboardingStep =
  | "statp2"
  | "statp3"
  | "statp4"
  | "statp5"
  | "statp7"
  | "dashboard";

type StageResponse = {
  token?: unknown;
  wheretogo?: unknown;
  message?: unknown;
  error?: unknown;
  data?: {
    token?: unknown;
    wheretogo?: unknown;
    message?: unknown;
    error?: unknown;
  };
};

const STEP_TO_ROUTE: Record<OnboardingStep, string> = {
  statp2: "/signup/step-2",
  statp3: "/signup/step-3",
  statp4: "/signup/step-4",
  statp5: "/signup/step-5",
  statp7: "/signup/step-7",
  dashboard: "/",
};

function getFirstText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = getFirstText(item);
      if (text) return text;
    }
  }

  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      const text = getFirstText(item);
      if (text) return text;
    }
  }

  return null;
}

function getResponseToken(data: StageResponse): string {
  return typeof data.token === "string"
    ? data.token
    : typeof data.data?.token === "string"
      ? data.data.token
      : "";
}

function getResponseStage(data: StageResponse): string {
  return typeof data.wheretogo === "string"
    ? data.wheretogo
    : typeof data.data?.wheretogo === "string"
      ? data.data.wheretogo
      : "";
}

export function getRouteFromWhereToGo(wheretogo: string | null | undefined) {
  return STEP_TO_ROUTE[wheretogo as OnboardingStep] || "/";
}

export function isImpersonationSession() {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(AUTH_KEYS.IMPERSONATE_TOKEN));
}

export function persistAuthToken(token: string, wheretogo?: string) {
  if (typeof window === "undefined" || !token) return;

  if (isImpersonationSession()) {
    sessionStorage.setItem(AUTH_KEYS.IMPERSONATE_TOKEN, token);
    setTabSession("user");

    if (wheretogo) {
      sessionStorage.setItem("wheretogo", wheretogo);
    }

    return;
  }

  localStorage.setItem("token", token);
  localStorage.setItem(AUTH_KEYS.USER_TOKEN, token);

  if (wheretogo) {
    localStorage.setItem("wheretogo", wheretogo);
  }
}

export async function refreshOnboardingStage(): Promise<string> {
  const authToken = getToken();

  if (!authToken) {
    throw new Error("Session expired. Please login again.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };

  if (isImpersonationSession()) {
    headers["X-Impersonation-Session"] = "1";
  }

  const response = await fetch("/api/auth/update-stage", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers,
  });

  const data = (await response.json().catch(() => ({}))) as StageResponse;

  if (!response.ok) {
    throw new Error(
      getFirstText(data.message) ||
        getFirstText(data.error) ||
        getFirstText(data.data?.message) ||
        getFirstText(data.data?.error) ||
        "Failed to refresh onboarding step"
    );
  }

  const wheretogo = getResponseStage(data);
  const token = getResponseToken(data);

  if (!wheretogo) {
    throw new Error("Missing onboarding step in response");
  }

  if (token) {
    persistAuthToken(token, wheretogo);
  } else if (typeof window !== "undefined") {
    const storage = isImpersonationSession() ? sessionStorage : localStorage;
    storage.setItem("wheretogo", wheretogo);
  }

  return wheretogo;
}
