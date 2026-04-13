import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { normalizeRole } from "@/lib/auth";

export interface SignupResponse {
  code: number;
  token: string;
  message: string;
  role: number;
  wheretogo: string;
  filldata: Record<string, any>;
  error?: string | { email?: string[] };
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  route: string;
  requiredFields: string[];
}

export const ONBOARDING_STEPS: Record<string, OnboardingStep> = {
  statp2: {
    id: "statp2",
    title: "Email Verification",
    description: "Verify your email address to activate your account",
    route: "/signup/step-2",
    requiredFields: ["is_email_verified"],
  },
  statp3: {
    id: "statp3",
    title: "Basic Information",
    description: "Tell us about yourself",
    route: "/signup/step-3",
    requiredFields: ["first_name", "last_name", "country"],
  },
  statp4: {
    id: "statp4",
    title: "Address Information",
    description: "Provide your address details",
    route: "/signup/step-4",
    requiredFields: ["address", "zipcode", "city"],
  },
  statp5: {
    id: "statp5",
    title: "Business Information",
    description: "Tell us about your business",
    route: "/signup/step-5",
    requiredFields: ["hmpiyt", "hmcdh", "sellonline"],
  },
  statp7: {
    id: "statp7",
    title: "Mobile Verification",
    description: "Verify your phone number",
    route: "/signup/step-7",
    requiredFields: ["is_mobile_verify"],
  },
};

export const useSignup = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = useCallback(
    async (email: string, password: string): Promise<SignupResponse | null> => {
      setError(null);
      setLoading(true);

      try {
        // Get reCAPTCHA token
        let recaptchaToken = "";
        if (typeof window !== "undefined" && (window as any).grecaptcha) {
          try {
            recaptchaToken = await (window as any).grecaptcha.execute();
          } catch (e) {
            console.warn("Failed to get reCAPTCHA token", e);
          }
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password,
            type: "signup",
            "g-recaptcha-response": recaptchaToken || "dummy_token",
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          const errorMsg = `Signup request failed: ${response.status}`;
          setError(errorMsg);
          console.error(errorMsg, errorBody);
          return null;
        }

        const data: SignupResponse = await response.json();

        if (data.code !== 200) {
          const errorMsg =
            typeof data.error === "string" ? data.error : 
            typeof data.error === "object" && data.error.email?.length
              ? data.error.email[0]
              : "Signup failed";
          setError(errorMsg);
          return null;
        }
        // Store credentials
        localStorage.setItem("token", data.token);
        const normalizedRole = normalizeRole(data.role);
        if (normalizedRole) {
          localStorage.setItem("role", normalizedRole);
        } else {
          localStorage.removeItem("role");
        }
        localStorage.setItem("wheretogo", data.wheretogo);
        localStorage.setItem("userData", JSON.stringify(data.filldata));

        // Set cookies with consistent normalized role
        document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        if (normalizedRole) {
          document.cookie = `role=${encodeURIComponent(normalizedRole)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        } else {
          document.cookie = `role=; Path=/; Max-Age=0; SameSite=Lax`;
        }

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const routeToNext = useCallback(
    (wheretogo: string) => {
      const step = ONBOARDING_STEPS[wheretogo];
      if (step) {
        router.push(step.route);
      } else {
        router.push("/");
      }
    },
    [router]
  );

  const getOnboardingProgress = useCallback((wheretogo: string) => {
    const steps = Object.values(ONBOARDING_STEPS);
    const currentIndex = steps.findIndex((s) => s.id === wheretogo);
    return {
      currentStep: currentIndex + 1,
      totalSteps: steps.length,
      completed: currentIndex,
    };
  }, []);

  return {
    signup,
    routeToNext,
    loading,
    error,
    getOnboardingProgress,
    ONBOARDING_STEPS,
  };
};
