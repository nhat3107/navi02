import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLoginApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../../../shared/constants/routes';
import { decodeJwtPayload } from '../../../shared/utils/jwt';
import type { AdminLoginRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const login = async (data: AdminLoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLoginApi(data);
      const payload = decodeJwtPayload<{
        sub: string;
        email: string;
        role: string;
      }>(res.accessToken);
      if (!payload?.sub || !payload?.email || payload.role !== 'admin') {
        setError('Invalid admin session. Please try again.');
        return;
      }
      setAuth(
        { id: payload.sub, email: payload.email, role: payload.role },
        res.accessToken,
      );
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const message = axiosErr.response?.data?.message ?? '';
      setError(message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
