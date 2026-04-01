import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth.store';
import { completeOAuthSession } from '../features/auth/lib/completeOAuthSession';
import { decodeJwtPayload } from '../shared/utils/jwt';

const ACCESS_TOKEN_KEYS = [
  'access_token',
  'AccessToken',
  'accessToken',
  'token',
] as const;

let lastProcessedOAuthToken: string | null = null;

function stripOAuthParamsFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of ACCESS_TOKEN_KEYS) {
    params.delete(key);
  }
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/**
 * Đọc `access_token` từ query (OAUTH_FLOW.md), `completeOAuthSession` lưu bearer + gọi profile;
 * refresh chỉ qua cookie HttpOnly `refresh_token` + withCredentials.
 */
export function OAuthReturnHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw =
      ACCESS_TOKEN_KEYS.map((k) => params.get(k)?.trim()).find(Boolean) ?? null;

    if (!raw) {
      return;
    }

    if (lastProcessedOAuthToken === raw) {
      return;
    }
    lastProcessedOAuthToken = raw;

    const cleanSuffix = stripOAuthParamsFromSearch(location.search);
    const cleanPath = `${location.pathname}${cleanSuffix}`;
    navigate(cleanPath, { replace: true });

    const payload = decodeJwtPayload<{ sub: string; email: string }>(raw);
    if (!payload?.sub || !payload?.email) {
      lastProcessedOAuthToken = null;
      return;
    }

    void completeOAuthSession(raw, navigate, setAuth);
  }, [location.search, location.pathname, navigate, setAuth]);

  return null;
}
