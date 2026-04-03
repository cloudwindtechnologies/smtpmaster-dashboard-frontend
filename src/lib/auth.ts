export const AUTH_KEYS = {
  SUPERADMIN_TOKEN: 'superadmin_token',
  SUPERADMIN_ROLE: 'superadmin_role',
  USER_TOKEN: 'user_token',
  IMPERSONATE_TOKEN: 'impersonate_token', // Tab-specific impersonation token
};

// Store tab-specific session type in sessionStorage
export const getTabSession = (): 'superadmin' | 'user' => {
  if (typeof window === 'undefined') return 'superadmin';
  
  // Check explicit tab session first
  const explicit = sessionStorage.getItem('tab_session') as 'superadmin' | 'user' | null;
  if (explicit) return explicit;
  
  return 'superadmin';
};

export const setTabSession = (type: 'superadmin' | 'user'): void => {
  sessionStorage.setItem('tab_session', type);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const tabSession = getTabSession();
  
  if (tabSession === 'user') {
    // ✅ Check sessionStorage first (impersonation), then localStorage (regular user)
    return sessionStorage.getItem(AUTH_KEYS.IMPERSONATE_TOKEN) || 
           localStorage.getItem(AUTH_KEYS.USER_TOKEN);
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
  if (sessionStorage.getItem('impersonate_token')) {
    setTabSession('user');
    return true;
  }
  
  // Legacy check (for regular users, not impersonation)
  if (localStorage.getItem(AUTH_KEYS.USER_TOKEN)) {
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
  localStorage.setItem(AUTH_KEYS.SUPERADMIN_TOKEN, token);
  localStorage.setItem(AUTH_KEYS.SUPERADMIN_ROLE, role);
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  setTabSession('superadmin');
};

// Set regular user session (not impersonation)
export const setUserSessionInCurrentTab = (token: string): void => {
  localStorage.setItem(AUTH_KEYS.USER_TOKEN, token);
  setTabSession('user');
};
