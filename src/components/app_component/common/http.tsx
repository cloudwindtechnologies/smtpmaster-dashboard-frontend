import { getToken as getAuthToken } from '@/lib/auth';

const envBackendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://backend.way2smtp.com";

export const apiURL = envBackendUrl;

export const token = (): string | null => {
  return getAuthToken();
};

export const getSuperadminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem('token');
};
