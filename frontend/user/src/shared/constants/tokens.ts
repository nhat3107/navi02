/**
 * Wire naming: `access_token` (JSON / query / localStorage), `refresh_token` (HttpOnly cookie).
 * Internal TS vars stay camelCase; `Authorization: Bearer` dùng JWT access.
 */

export const LS_ACCESS_TOKEN_KEY = 'access_token';

const LEGACY_LS_ACCESS_TOKEN_KEYS = ['AccessToken', 'accessToken'] as const;

export type AuthTokenBody = {
  access_token?: string;
  AccessToken?: string;
  accessToken?: string;
};

export function readAccessTokenFromBody(
  data: AuthTokenBody | null | undefined,
): string | null {
  const v = data?.access_token ?? data?.AccessToken ?? data?.accessToken;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Đọc access token đã lưu (migrate từ key cũ). */
export function getStoredAccessToken(): string | null {
  const primary = localStorage.getItem(LS_ACCESS_TOKEN_KEY);
  if (primary) return primary;
  for (const legacy of LEGACY_LS_ACCESS_TOKEN_KEYS) {
    const v = localStorage.getItem(legacy);
    if (v) {
      localStorage.setItem(LS_ACCESS_TOKEN_KEY, v);
      localStorage.removeItem(legacy);
      return v;
    }
  }
  return null;
}

export function persistAccessToken(token: string): void {
  localStorage.setItem(LS_ACCESS_TOKEN_KEY, token);
  for (const legacy of LEGACY_LS_ACCESS_TOKEN_KEYS) {
    localStorage.removeItem(legacy);
  }
}

export function clearAccessTokenStorage(): void {
  localStorage.removeItem(LS_ACCESS_TOKEN_KEY);
  for (const legacy of LEGACY_LS_ACCESS_TOKEN_KEYS) {
    localStorage.removeItem(legacy);
  }
}
