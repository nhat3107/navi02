import axios, { type AxiosError } from 'axios';
import {
  getStoredAdminToken,
  clearAdminTokenStorage,
} from '../constants/tokens';
import { ROUTES } from '../constants/routes';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getStoredAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== ROUTES.LOGIN) {
        clearAdminTokenStorage();
        window.location.href = ROUTES.LOGIN;
      }
    }
    return Promise.reject(error);
  },
);
