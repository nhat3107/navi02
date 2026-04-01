import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_ROUTES } from '../constants/routes';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const rawApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = rawApi
      .post<{ accessToken: string }>(API_ROUTES.REFRESH)
      .then((r) => {
        const token = r.data.accessToken;
        if (token) localStorage.setItem('accessToken', token);
        return token ?? null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthPublicPath(url: string): boolean {
  const u = url.replace(API_BASE_URL, '');
  return (
    u.includes('auth/signin') ||
    u.includes('auth/signup') ||
    u.includes('auth/verify-otp') ||
    u.includes('auth/resend-otp') ||
    u.includes('auth/refresh') ||
    u.includes('auth/forget-passwd') ||
    u.includes('auth/reset-passwd')
  );
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const reqUrl = original?.url ?? '';

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    if (isAuthPublicPath(reqUrl)) {
      return Promise.reject(error);
    }

    original._retry = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);
