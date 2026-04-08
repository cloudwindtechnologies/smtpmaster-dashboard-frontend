// lib/stage.ts

// Get token from localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Save new token to localStorage and cookie
function setToken(token: string): void {
  if (typeof window === "undefined") return;
  
  // Save to localStorage
  localStorage.setItem("token", token);
  
  // Save to cookie (for middleware)
  document.cookie = `token=${encodeURIComponent(token)}; Path=/; Max-Age=${
    60 * 60 * 24 * 7
  }; SameSite=Lax`;
}

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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
      setToken(data.token);
      return data.token;
    }
    
    return null;
  } catch (error) {
    console.error("Update stage failed:", error);
    throw error;
  }
}