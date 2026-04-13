export const AUTH_KEYS = {
  SUPERADMIN_TOKEN: 'superadmin_token',
  SUPERADMIN_ROLE: 'superadmin_role',
  USER_TOKEN: 'user_token',
  IMPERSONATE_TOKEN: 'impersonate_token', // Tab-specific impersonation token
};

export const ROLE_ACCESS = {
  ADMIN_SHELL: ["superadmin", "admin"],
} as const;

export type AccessRole = string;

export const getAccessRole = (role: string | number | null | undefined): AccessRole | null => {
  if (role === null || role === undefined) return null;

  const normalized = String(role).trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === "1" || normalized === "superadmin") {
    return "superadmin";
  }

  if (normalized === "admin") {
    return "admin";
  }

  if (normalized === "2" || normalized === "user" || normalized === "customer") {
    return "user";
  }

  return normalized;
};

export const hasAccessRole = (
  role: string | number | null | undefined,
  allowedRoles: readonly string[]
): boolean => {
  const accessRole = getAccessRole(role);
  return !!accessRole && allowedRoles.includes(accessRole);
};

export const canAccessAdminShell = (role: string | number | null | undefined): boolean => {
  return hasAccessRole(role, ROLE_ACCESS.ADMIN_SHELL);
};

export const normalizeRole = (role: string | number | null | undefined): string | null => {
  const accessRole = getAccessRole(role);
  if (!accessRole) return null;

  if (canAccessAdminShell(accessRole)) {
    return "superadmin";
  }

  return "user";
};

export const isSuperadminRole = (role: string | number | null | undefined): boolean => {
  return getAccessRole(role) === "superadmin";
};

export const hasAdminShellAccess = canAccessAdminShell;

// Store tab-specific session type in sessionStorage
export const getTabSession = (): 'superadmin' | 'user' => {
  if (typeof window === 'undefined') return 'superadmin';
  
  // Check explicit tab session first
  const explicit = sessionStorage.getItem('tab_session');
  if (explicit === 'superadmin' || explicit === 'user') return explicit;
  
  return 'superadmin';
};

export const setTabSession = (type: 'superadmin' | 'user'): void => {
  sessionStorage.setItem('tab_session', type);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const impersonationToken = sessionStorage.getItem(AUTH_KEYS.IMPERSONATE_TOKEN);

  if (impersonationToken) {
    setTabSession('user');
    return impersonationToken;
  }
  
  const tabSession = getTabSession();
  
  if (tabSession === 'user') {
    // ✅ Check sessionStorage first (impersonation), then localStorage (regular user)
    if (normalizeRole(localStorage.getItem('role')) !== 'superadmin') {
      return localStorage.getItem(AUTH_KEYS.USER_TOKEN);
    }
  }
  
  return localStorage.getItem(AUTH_KEYS.SUPERADMIN_TOKEN) || localStorage.getItem('token');
};

// ✅ For impersonation: store token in sessionStorage (tab-specific only!)
export const setImpersonationSession = (token: string): void => {
  sessionStorage.setItem(AUTH_KEYS.IMPERSONATE_TOKEN, token);
  setTabSession('user');
};

// Check if current tab is user
export const isUserTab = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check explicit tab session
  if (sessionStorage.getItem('tab_session') === 'user') return true;
  
  // Check if impersonation token exists in this tab
  if (sessionStorage.getItem(AUTH_KEYS.IMPERSONATE_TOKEN)) {
    setTabSession('user');
    return true;
  }
  
  // Legacy check (for regular users, not impersonation)
  if (
    localStorage.getItem(AUTH_KEYS.USER_TOKEN) &&
    normalizeRole(localStorage.getItem('role')) !== 'superadmin'
  ) {
    setTabSession('user');
    return true;
  }
  
  return false;
};

export const isSuperadminTab = (): boolean => {
  return !isUserTab();
};

// Set superadmin session (called at login)
export const setSuperadminSession = (token: string, role: string): void => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw new Error('Invalid role provided to setSuperadminSession');
  }

  localStorage.removeItem(AUTH_KEYS.USER_TOKEN);
  localStorage.removeItem('is_impersonating');
  localStorage.removeItem('impersonated_user_id');
  localStorage.removeItem('imp_user_id');
  sessionStorage.removeItem(AUTH_KEYS.IMPERSONATE_TOKEN);
  sessionStorage.removeItem('is_impersonated');
  sessionStorage.removeItem('impersonated_user_id');
  localStorage.setItem(AUTH_KEYS.SUPERADMIN_TOKEN, token);
  localStorage.setItem(AUTH_KEYS.SUPERADMIN_ROLE, normalizedRole);
  localStorage.setItem('role', normalizedRole);
  localStorage.setItem('token', token);
  setTabSession('superadmin');
};

// Set regular user session (not impersonation)
export const setUserSessionInCurrentTab = (token: string): void => {
  localStorage.setItem(AUTH_KEYS.USER_TOKEN, token);
  setTabSession('user');
};
