import { getToken as getAuthToken } from '@/lib/auth';

const envBackendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://dash-backend.smtpmaster.com";

export const apiURL = 'https://dash-backend.smtpmaster.com';

export const token = (): string | null => {
  return getAuthToken();
};

export const getSuperadminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem('token');
};
