import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../../../shared/constants/routes';
import { getOAuthUrl } from '../api/auth.api';

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
    const token = searchParams.get('token');
    if (token) {
      setAuth({ id: '', email: '' }, token);
      navigate(ROUTES.ONBOARD, { replace: true });
    } else {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [searchParams, setAuth, navigate]);
}
