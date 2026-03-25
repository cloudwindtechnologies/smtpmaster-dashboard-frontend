// lib/auth.ts
export const AUTH_KEYS = {
  SUPERADMIN_TOKEN: 'superadmin_token',
  SUPERADMIN_ROLE: 'superadmin_role',
  USER_TOKEN: 'user_token',
};

// Store tab-specific session type in sessionStorage
export const getTabSession = (): 'superadmin' | 'user' => {
  if (typeof window === 'undefined') return 'superadmin';
  
  
  // First check if explicitly set
  const explicit = sessionStorage.getItem('tab_session') as 'superadmin' | 'user';
  if (explicit) {
    console.log('Tab session from storage:', explicit);
    return explicit;
  }
  
  // If not set, try to infer from URL and tokens
  const isUserPage = !window.location.pathname.includes('/super-admin') && 
                     !window.location.pathname.includes('/admin');
  const userToken = localStorage.getItem(AUTH_KEYS.USER_TOKEN);
  const role = localStorage.getItem('role');
  
  console.log('Inferring tab session:', { isUserPage, userToken, role });
  
  // If it's a user page and we have a user token or the role isn't superadmin, treat it as user
if (isUserPage && userToken) {
  console.log('Setting inferred tab session to user');
  setTabSession('user');
  return 'user';
}
  
  console.log('Defaulting to superadmin');
  return 'superadmin';
};

export const setTabSession = (type: 'superadmin' | 'user'): void => {
  sessionStorage.setItem('tab_session', type);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const tabSession = getTabSession();
  
  // Each tab knows its own type from sessionStorage
  if (tabSession === 'user') {
    return localStorage.getItem(AUTH_KEYS.USER_TOKEN);
  }
  
  return localStorage.getItem(AUTH_KEYS.SUPERADMIN_TOKEN) || localStorage.getItem('token');
};

// Set superadmin session (called at login)
export const setSuperadminSession = (token: string, role: string): void => {
  localStorage.setItem(AUTH_KEYS.SUPERADMIN_TOKEN, token);
  localStorage.setItem(AUTH_KEYS.SUPERADMIN_ROLE, role);
  localStorage.setItem('token', token); // Backward compatibility
  localStorage.setItem('role', role);
  
  // This tab is superadmin
  setTabSession('superadmin');
};

// Set user session in the NEW TAB only
export const setUserSessionInCurrentTab = (token: string): void => {
  localStorage.setItem(AUTH_KEYS.USER_TOKEN, token); // Store in localStorage (shared)
  setTabSession('user'); // This tab identifies as user
};

// Check if current tab is superadmin
export const isSuperadminTab = (): boolean => {
  return getTabSession() === 'superadmin';
};

// Check if current tab is user
export const isUserTab = (): boolean => {
  return getTabSession() === 'user';
};