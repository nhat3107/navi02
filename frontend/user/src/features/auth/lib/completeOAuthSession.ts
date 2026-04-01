import type { NavigateFunction } from 'react-router-dom';
import { getProfileApi } from '../api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import { decodeJwtPayload } from '../../../shared/utils/jwt';
import type { User } from '../types/auth.types';
import type { AxiosError } from 'axios';

/**
 * After OAuth redirect: store access token, then load profile and route (per OAUTH_FLOW.md).
 */
export async function completeOAuthSession(
  accessToken: string,
  navigate: NavigateFunction,
  setAuth: (user: User, token: string) => void,
): Promise<void> {
  const payload = decodeJwtPayload<{ sub: string; email: string }>(
    accessToken,
  );
  if (!payload?.sub || !payload?.email) {
    return;
  }

  setAuth({ id: payload.sub, email: payload.email }, accessToken);

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
}
