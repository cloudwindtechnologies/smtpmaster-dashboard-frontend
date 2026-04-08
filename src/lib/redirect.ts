
// export function setPendingRedirect(path: string | null): void {
//   if (typeof window === "undefined") return;
//   if (!path) return;
//   if (!path.startsWith("/")) return;           // Must start with /
//   if (path.startsWith("//")) return;           // Block http://
//   if (path.includes("://")) return;            // Block full URLs
//   if (path === "/login" || path.startsWith("/login?")) return;
//   if (path === "/signup" || path.startsWith("/signup")) return;

//   sessionStorage.setItem("pending_redirect", path);
// }

// // Get saved URL
// export function getPendingRedirect(): string | null {
//   if (typeof window === "undefined") return null;
//   return sessionStorage.getItem("pending_redirect");
// }

// // Clear saved URL
// export function clearPendingRedirect(): void {
//   if (typeof window === "undefined") return;
//   sessionStorage.removeItem("pending_redirect");
// }

// // Get redirect from current page URL (like ?redirect=/dashboard)
// export function getRedirectFromUrl(): string | null {
//   if (typeof window === "undefined") return null;
  
//   const params = new URLSearchParams(window.location.search);
//   const redirect = params.get("redirect");
  
//   if (!redirect) return null;
//   if (!redirect.startsWith("/")) return null;
//   if (redirect.startsWith("//")) return null;
//   if (redirect.includes("://")) return null;
//   if (redirect === "/login" || redirect.startsWith("/login?")) return null;
//   if (redirect === "/signup" || redirect.startsWith("/signup")) return null;
  
//   return redirect;
// }