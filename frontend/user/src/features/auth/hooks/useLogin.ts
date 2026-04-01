import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInApi, getProfileApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../../../shared/constants/routes';
import {
  PENDING_VERIFICATION_EMAIL_KEY,
  VERIFY_EMAIL_QUERY,
} from '../../../shared/constants/auth-storage';
import { decodeJwtPayload } from '../../../shared/utils/jwt';
import type { LoginRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';

function isUnverifiedSignIn403(status: number | undefined, message: string) {
  if (status !== 403) return false;
  return /email not verified|verify your email/i.test(message);
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const login = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInApi(data);
      const payload = decodeJwtPayload<{ sub: string; email: string }>(
        res.accessToken,
      );
      if (!payload?.sub || !payload?.email) {
        setError('Invalid session. Please try again.');
        return;
      }
      setAuth({ id: payload.sub, email: payload.email }, res.accessToken);

      try {
        await getProfileApi();
        navigate(ROUTES.HOME);
      } catch (profileErr) {
        const p = profileErr as AxiosError<{ statusCode?: number }>;
        if (p.response?.status === 404) {
          navigate(ROUTES.ONBOARD);
        } else if (p.response?.status === 401) {
          setError(
            'Your session could not be validated. If this keeps happening, the API gateway and auth service must use the same JWT_ACCESS_SECRET.',
          );
        } else {
          const msg =
            (profileErr as AxiosError<{ message?: string }>).response?.data
              ?.message ?? 'Could not load your profile.';
          setError(msg);
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status;
      const message = axiosErr.response?.data?.message ?? '';

      if (isUnverifiedSignIn403(status, message)) {
        sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, data.email);
        const q = `${VERIFY_EMAIL_QUERY}=${encodeURIComponent(data.email)}`;
        navigate(`${ROUTES.VERIFY_OTP}?${q}`, {
          replace: true,
          state: { email: data.email },
        });
        return;
      }

      setError(message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
