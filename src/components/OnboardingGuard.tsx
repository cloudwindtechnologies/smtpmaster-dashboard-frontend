// "use client";

// import { useRouter, usePathname } from "next/navigation";
// import { useEffect, useState } from "react";

// interface OnboardingStep {
//   id: string;
//   routes: string[];
//   requiredFields: string[];
//   nextStep?: string;
// }

// const ONBOARDING_STEPS: Record<string, OnboardingStep> = {
//   statp2: {
//     id: "statp2",
//     routes: ["/email-verification"],
//     requiredFields: ["is_email_varified"],
//   },
//   statp3: {
//     id: "statp3",
//     routes: ["/onboarding/basic-info"],
//     requiredFields: ["first_name", "last_name", "country"],
//   },
//   statp4: {
//     id: "statp4",
//     routes: ["/onboarding/address-info"],
//     requiredFields: ["address", "zipcode", "city"],
//   },
//   statp5: {
//     id: "statp5",
//     routes: ["/onboarding/business-info"],
//     requiredFields: ["hmpiyt", "hmcdh", "sellonline"],
//   },
//   statp7: {
//     id: "statp7",
//     routes: ["/onboarding/mobile-verify"],
//     requiredFields: ["is_mobile_verify"],
//   },
//   dashboard: {
//     id: "dashboard",
//     routes: ["/dashboard", "/admin", "/user"],
//     requiredFields: [],
//   },
// };

// const PUBLIC_ROUTES = ["/login", "/signup", "/"];
// const PROTECTED_ROUTES = Object.values(ONBOARDING_STEPS).flatMap(
//   (step) => step.routes
// );

// interface OnboardingGuardProps {
//   children: React.ReactNode;
//   allowedSteps?: string[];
// }

// export default function OnboardingGuard({
//   children,
//   allowedSteps,
// }: OnboardingGuardProps) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [isLoading, setIsLoading] = useState(true);
//   const [isAuthorized, setIsAuthorized] = useState(false);

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         // Check if on public route
//         if (PUBLIC_ROUTES.some((route) => pathname === route)) {
//           setIsAuthorized(true);
//           setIsLoading(false);
//           return;
//         }

//         // Get token
//         const token = localStorage.getItem("token");
//         if (!token) {
//           // Not logged in
//           router.push("/login");
//           return;
//         }

//         // Validate token with backend
//         const response = await fetch("/api/auth/IsTokenValid", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!response.ok) {
//           // Token invalid or expired
//           localStorage.clear();
//           document.cookie = "token=; Max-Age=0";
//           document.cookie = "role=; Max-Age=0";
//           router.push("/login");
//           return;
//         }

//         // Get wheretogo routing info
//         const routeResponse = await fetch("/api/auth/routefinder", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!routeResponse.ok) {
//           throw new Error("Failed to get routing info");
//         }

//         const routeData = await routeResponse.json();
//         const wheretogo = routeData.wheretogo || "dashboard";

//         // Store for later use
//         localStorage.setItem("wheretogo", wheretogo);

//         // Check if current route is allowed for this step
//         const step = ONBOARDING_STEPS[wheretogo];
//         const isCurrentRouteAllowed = step?.routes.some((route) =>
//           pathname.startsWith(route)
//         );

//         if (!isCurrentRouteAllowed && !allowedSteps?.includes(wheretogo)) {
//           // Redirect to correct step
//           if (step) {
//             router.push(step.routes[0]);
//           } else {
//             router.push("/dashboard");
//           }
//           return;
//         }

//         setIsAuthorized(true);
//       } catch (error) {
//         console.error("Auth check failed:", error);
//         localStorage.clear();
//         router.push("/login");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     checkAuth();
//   }, [pathname, router, allowedSteps]);

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
//       </div>
//     );
//   }

//   if (!isAuthorized) {
//     return null;
//   }

//   return <>{children}</>;
// }

// /**
//  * Hook to get current onboarding step and routing info
//  */
// export function useOnboarding() {
//   const [wheretogo, setWheretogo] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.push("/login");
//       return;
//     }

//     const checkStep = async () => {
//       try {
//         const response = await fetch("/api/auth/routefinder", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!response.ok) throw new Error("Failed to fetch routing info");

//         const data = await response.json();
//         setWheretogo(data.wheretogo);
//       } catch (error) {
//         console.error("Failed to check onboarding step:", error);
//         router.push("/login");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     checkStep();
//   }, [router]);

//   const moveToNext = (step: string) => {
//     const nextStep = ONBOARDING_STEPS[step];
//     if (nextStep) {
//       setWheretogo(step);
//       router.push(nextStep.routes[0]);
//     }
//   };

//   return {
//     wheretogo,
//     isLoading,
//     moveToNext,
//     step: wheretogo ? ONBOARDING_STEPS[wheretogo] : null,
//   };
// }

// /**
//  * Component to show onboarding progress
//  */
// interface OnboardingProgressProps {
//   currentStep: string;
//   variant?: "linear" | "steps";
// }

// export function OnboardingProgress({
//   currentStep,
//   variant = "linear",
// }: OnboardingProgressProps) {
//   const steps = Object.values(ONBOARDING_STEPS).filter(
//     (step) => step.id !== "dashboard"
//   );
//   const currentIndex = steps.findIndex((step) => step.id === currentStep);

//   if (variant === "steps") {
//     return (
//       <div className="mb-8 rounded-lg bg-gray-50 p-4">
//         <div className="mb-2 flex items-center justify-between">
//           <span className="text-sm font-medium text-gray-700">
//             Step {currentIndex + 1} of {steps.length}
//           </span>
//           <span className="text-sm text-gray-500">
//             {Math.round(((currentIndex + 1) / steps.length) * 100)}%
//           </span>
//         </div>
//         <div className="h-2 w-full rounded-full bg-gray-200">
//           <div
//             className="h-2 rounded-full bg-blue-600 transition-all duration-300"
//             style={{
//               width: `${((currentIndex + 1) / steps.length) * 100}%`,
//             }}
//           ></div>
//         </div>
//         <p className="mt-2 text-xs text-gray-600">
//           Complete all steps to access your dashboard
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="mb-8">
//       <div className="flex items-center justify-between">
//         {steps.map((step, index) => (
//           <div key={step.id} className="flex items-center">
//             <div
//               className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
//                 index <= currentIndex
//                   ? "bg-blue-600 text-white"
//                   : "bg-gray-200 text-gray-600"
//               }`}
//             >
//               {index + 1}
//             </div>
//             {index < steps.length - 1 && (
//               <div
//                 className={`h-1 w-8 mx-2 ${
//                   index < currentIndex ? "bg-blue-600" : "bg-gray-200"
//                 }`}
//               ></div>
//             )}
//           </div>
//         ))}
//       </div>
//       <div className="mt-2 text-sm text-gray-600">
//         {ONBOARDING_STEPS[currentStep]?.id === "dashboard"
//           ? "All steps complete!"
//           : `Current: ${currentStep}`}
//       </div>
//     </div>
//   );
// }
