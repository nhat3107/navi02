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
import { loginToast } from '../../../shared/store/toast.store';
import type { LoginRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';
import {
  blockedSignInToastMessage,
  extractApiErrorMessage,
  isBlockedSignIn403,
  isUnverifiedSignIn403,
} from '../lib/signInErrors';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const login = async (data: LoginRequest) => {
    setLoading(true);
    try {
      const res = await signInApi(data);
      const payload = decodeJwtPayload<{ sub: string; email: string }>(
        res.accessToken,
      );
      if (!payload?.sub || !payload?.email) {
        loginToast('Invalid session. Please try again.');
        return;
      }
      setAuth({ id: payload.sub, email: payload.email }, res.accessToken);

      try {
        await getProfileApi();
        navigate(ROUTES.HOME, { replace: true });
      } catch (profileErr) {
        const p = profileErr as AxiosError<{ statusCode?: number }>;
        if (p.response?.status === 404) {
          navigate(ROUTES.ONBOARD, { replace: true });
        } else if (p.response?.status === 401) {
          loginToast(
            'Your session could not be validated. If this keeps happening, the API gateway and auth service must use the same JWT_ACCESS_SECRET.',
          );
        } else {
          loginToast(
            extractApiErrorMessage(profileErr, 'Could not load your profile.'),
          );
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string | string[] }>;
      const status = axiosErr.response?.status;
      const message = extractApiErrorMessage(err, '');

      if (isUnverifiedSignIn403(status, message)) {
        sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, data.email);
        const q = `${VERIFY_EMAIL_QUERY}=${encodeURIComponent(data.email)}`;
        navigate(`${ROUTES.VERIFY_OTP}?${q}`, {
          replace: true,
          state: { email: data.email },
        });
        return;
      }

      if (isBlockedSignIn403(status, message)) {
        loginToast(blockedSignInToastMessage(message), 'error', 8000);
        return;
      }

      loginToast(message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
}
