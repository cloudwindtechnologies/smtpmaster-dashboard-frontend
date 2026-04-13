// lib/stage.ts

import { getToken } from "@/lib/auth";
import { isImpersonationSession, persistAuthToken } from "@/lib/onboarding";

// Main function: Call this when user completes a step
export async function updateUserStage(newStage: string): Promise<string | null> {
  try {
    const token = getToken();
    if (!token) {
      console.error("No token found");
      return null;
    }

    const response = await fetch("/api/auth/update-stage", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(isImpersonationSession() ? { "X-Impersonation-Session": "1" } : {}),
      },
      body: JSON.stringify({ wheretogo: newStage }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update stage");
    }

    const data = await response.json();
    
    // Save the new token
    if (data.token) {
      persistAuthToken(data.token, data.wheretogo);
      return data.token;
    }
    
    return null;
  } catch (error) {
    console.error("Update stage failed:", error);
    throw error;
  }
}
