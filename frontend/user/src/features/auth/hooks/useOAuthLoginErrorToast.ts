import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  OAUTH_ERROR_BLOCKED,
  OAUTH_ERROR_MESSAGE_QUERY,
  OAUTH_ERROR_QUERY,
} from '../../../shared/constants/auth-storage';
import { loginToast } from '../../../shared/store/toast.store';
import { ROUTES } from '../../../shared/constants/routes';
import {
  blockedSignInToastMessage,
  isBlockedSignIn403,
} from '../lib/signInErrors';

/** Show login toast when OAuth redirect returns blocked / failed (query params). */
export function useOAuthLoginErrorToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get(OAUTH_ERROR_QUERY)?.trim();
    if (!oauthError) return;

    const signature = `${location.pathname}?${location.search}`;
    if (handledRef.current === signature) return;
    handledRef.current = signature;

    const message = params.get(OAUTH_ERROR_MESSAGE_QUERY)?.trim() ?? '';

    if (
      oauthError === OAUTH_ERROR_BLOCKED ||
      isBlockedSignIn403(403, message)
    ) {
      loginToast(blockedSignInToastMessage(message), 'error', 8000);
    } else {
      loginToast(
        message || 'Sign in with your provider failed. Please try again.',
        'error',
      );
    }

    params.delete(OAUTH_ERROR_QUERY);
    params.delete(OAUTH_ERROR_MESSAGE_QUERY);
    const rest = params.toString();
    navigate(
      { pathname: ROUTES.LOGIN, search: rest ? `?${rest}` : '' },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);
}
