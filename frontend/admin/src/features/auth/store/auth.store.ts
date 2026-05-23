import { create } from 'zustand';
import type { Admin, AdminAuthState } from '../types/auth.types';
import { decodeJwtPayload } from '../../../shared/utils/jwt';
import {
  getStoredAdminToken,
  persistAdminToken,
  clearAdminTokenStorage,
} from '../../../shared/constants/tokens';

function readStoredSession(): { admin: Admin | null; accessToken: string | null } {
  const token = getStoredAdminToken();
  if (!token) return { admin: null, accessToken: null };
  const payload = decodeJwtPayload<{
    sub: string;
    email: string;
    role: string;
  }>(token);
  if (!payload?.sub || !payload?.email || payload.role !== 'admin') {
    clearAdminTokenStorage();
    return { admin: null, accessToken: null };
  }
  return {
    admin: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    accessToken: token,
  };
}

const initial = readStoredSession();

export const useAuthStore = create<AdminAuthState>((set) => ({
  admin: initial.admin,
  accessToken: initial.accessToken,
  isAuthenticated: !!initial.accessToken && !!initial.admin,

  setAuth: (admin: Admin, accessToken: string) => {
    persistAdminToken(accessToken);
    set({ admin, accessToken, isAuthenticated: true });
  },

  logout: () => {
    clearAdminTokenStorage();
    set({ admin: null, accessToken: null, isAuthenticated: false });
  },
}));
