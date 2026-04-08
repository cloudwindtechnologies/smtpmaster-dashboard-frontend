// "use client";

// import React, { useEffect, useState } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import { getVerifiedStep, STEP_ROUTES, OnboardingStep, clearAllAuth } from "@/lib/auth";
// import { Loader2 } from "lucide-react";

// interface OnboardingGuardProps {
//   children: React.ReactNode;
//   requiredStep?: OnboardingStep;
//   allowPrevious?: boolean; // Allow going back to previous steps
// }

// export default function OnboardingGuard({ 
//   children, 
//   requiredStep,
//   allowPrevious = true 
// }: OnboardingGuardProps) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [isVerifying, setIsVerifying] = useState(true);
//   const [isAllowed, setIsAllowed] = useState(false);

//   useEffect(() => {
//     const verifyAccess = async () => {
//       try {
//         // Get step from JWT (not localStorage)
//         const currentStep = await getVerifiedStep();
        
//         if (!currentStep) {
//           // No valid token
//           clearAllAuth();
//           router.replace("/login?error=session_expired");
//           return;
//         }

//         // If on dashboard path but not dashboard step, middleware already handled it
//         // But we double-check here for client-side navigation
//         if (pathname === "/" && currentStep !== "dashboard") {
//           window.location.href = STEP_ROUTES[currentStep];
//           return;
//         }

//         // Check specific step requirement
//         if (requiredStep) {
//           const stepOrder = ["statp2", "statp3", "statp4", "statp5", "statp7", "dashboard"];
//           const currentIndex = stepOrder.indexOf(currentStep);
//           const requiredIndex = stepOrder.indexOf(requiredStep);

//           if (currentIndex < requiredIndex) {
//             // Behind required step
//             window.location.href = STEP_ROUTES[currentStep];
//             return;
//           }

//           if (!allowPrevious && currentIndex > requiredIndex) {
//             // Ahead of required step (shouldn't happen normally)
//             window.location.href = STEP_ROUTES[currentStep];
//             return;
//           }
//         }

//         setIsAllowed(true);
//       } catch (error) {
//         console.error("Verification error:", error);
//         clearAllAuth();
//         router.replace("/login");
//       } finally {
//         setIsVerifying(false);
//       }
//     };

//     verifyAccess();

//     // Listen for storage changes (tamper detection)
//     const handleStorageChange = (e: StorageEvent) => {
//       if (e.key === "wheretogo" || e.key === "token") {
//         // Someone modified storage, re-verify
//         window.location.reload();
//       }
//     };

//     window.addEventListener("storage", handleStorageChange);
//     return () => window.removeEventListener("storage", handleStorageChange);
//   }, [pathname, requiredStep, allowPrevious, router]);

//   if (isVerifying) {
//     return (
//       <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center">
//         <div className="flex flex-col items-center gap-4">
//           <Loader2 className="h-8 w-8 animate-spin text-[#ff7800]" />
//           <p className="text-gray-600">Verifying access...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!isAllowed) {
//     return null;
//   }

//   return <>{children}</>;
// }