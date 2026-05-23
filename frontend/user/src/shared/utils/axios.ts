import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_ROUTES } from '../constants/routes';
import {
  readAccessTokenFromBody,
  getStoredAccessToken,
  persistAccessToken,
  clearAccessTokenStorage,
  type AuthTokenBody,
} from '../constants/tokens';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** Không gắn interceptor — dùng cho POST /auth/refresh (chỉ cookie, tránh vòng lặp). */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post(API_ROUTES.REFRESH)
      .then((r) => {
        const token = readAccessTokenFromBody(r.data as AuthTokenBody);
        if (token) persistAccessToken(token);
        return token;
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
  const token = getStoredAccessToken();
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
      clearAccessTokenStorage();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);
