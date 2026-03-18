import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export interface SignupResponse {
  code: number;
  token: string;
  message: string;
  role: number;
  wheretogo: string;
  filldata: Record<string, any>;
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
    route: "/email-verification",
    requiredFields: ["is_email_varified"],
  },
  statp3: {
    id: "statp3",
    title: "Basic Information",
    description: "Tell us about yourself",
    route: "/onboarding/basic-info",
    requiredFields: ["first_name", "last_name", "country"],
  },
  statp4: {
    id: "statp4",
    title: "Address Information",
    description: "Provide your address details",
    route: "/onboarding/address-info",
    requiredFields: ["address", "zipcode", "city"],
  },
  statp5: {
    id: "statp5",
    title: "Business Information",
    description: "Tell us about your business",
    route: "/onboarding/business-info",
    requiredFields: ["hmpiyt", "hmcdh", "sellonline"],
  },
  statp7: {
    id: "statp7",
    title: "Mobile Verification",
    description: "Verify your phone number",
    route: "/onboarding/mobile-verify",
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
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password,
            type: "signup",
            "g-recaptcha-response": "dummy_token", // Replace with actual reCAPTCHA
          }),
        });

        const data: SignupResponse = await response.json();

        // if (data.code !== 200) {
        //   const errorMsg =
        //     typeof data.error === "string" ? data.error : 
        //     typeof data.error === "object" && data.error.email 
        //       ? data.error.email[0] 
        //       : "Signup failed";
        //   setError(errorMsg);
        //   return null;
        // }

        // Store credentials
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", String(data.role));
        localStorage.setItem("wheretogo", data.wheretogo);
        localStorage.setItem("userData", JSON.stringify(data.filldata));

        // Set cookies
        document.cookie = `token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `role=${encodeURIComponent(String(data.role))}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

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
        router.push("/dashboard");
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
