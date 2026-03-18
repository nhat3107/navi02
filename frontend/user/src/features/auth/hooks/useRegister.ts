import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerApi } from '../api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import type { RegisterRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const register = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      await registerApi(data);
      navigate(ROUTES.LOGIN);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ??
          'Registration failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
}
