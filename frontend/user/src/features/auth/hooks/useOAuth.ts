import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../../../shared/constants/routes';
import { getOAuthUrl, getProfileApi } from '../api/auth.api';
import { decodeJwtPayload } from '../../../shared/utils/jwt';
import type { AxiosError } from 'axios';

export function useOAuthRedirect() {
  const redirectTo = (provider: 'google' | 'github') => {
    window.location.href = getOAuthUrl(provider);
  };
  return { redirectTo };
}

export function useOAuthCallback() {
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get('token');
      if (!token) {
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }

      const payload = decodeJwtPayload<{ sub: string; email: string }>(token);
      if (!payload?.sub || !payload?.email) {
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }

      localStorage.setItem('accessToken', token);
      setAuth({ id: payload.sub, email: payload.email }, token);

      try {
        await getProfileApi();
        navigate(ROUTES.HOME, { replace: true });
      } catch (err) {
        const e = err as AxiosError<{ statusCode?: number }>;
        if (e.response?.status === 404) {
          navigate(ROUTES.ONBOARD, { replace: true });
        } else {
          navigate(ROUTES.HOME, { replace: true });
        }
      }
    };

    void run();
  }, [searchParams, setAuth, navigate]);
}
