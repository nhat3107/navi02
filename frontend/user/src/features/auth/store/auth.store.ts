import { create } from 'zustand';
import type { AuthState, User } from '../types/auth.types';
import { decodeJwtPayload } from '../../../shared/utils/jwt';
import {
  getStoredAccessToken,
  persistAccessToken,
  clearAccessTokenStorage,
} from '../../../shared/constants/tokens';

function readStoredSession(): { user: User | null; accessToken: string | null } {
  const token = getStoredAccessToken();
  if (!token) return { user: null, accessToken: null };
  const payload = decodeJwtPayload<{ sub: string; email: string }>(token);
  if (!payload?.sub || !payload?.email) {
    clearAccessTokenStorage();
    return { user: null, accessToken: null };
  }
  return {
    user: { id: payload.sub, email: payload.email },
    accessToken: token,
  };
}

const initial = readStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  accessToken: initial.accessToken,
  isAuthenticated: !!initial.accessToken && !!initial.user,

  setAuth: (user: User, accessToken: string) => {
    persistAccessToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: () => {
    clearAccessTokenStorage();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
