import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../../../shared/constants/routes';
import type { OnboardRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';

export function useOnboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onboard = async (data: OnboardRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await onboardApi(data);
      setAuth(res.user, res.accessToken);
      navigate(ROUTES.HOME);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ?? 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return { onboard, loading, error };
}
