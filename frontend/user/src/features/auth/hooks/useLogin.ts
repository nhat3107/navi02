import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../../../shared/constants/routes';
import type { LoginRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const login = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginApi(data);
      setAuth(res.user, res.accessToken);
      navigate(ROUTES.HOME);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ?? 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
