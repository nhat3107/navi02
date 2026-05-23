/** Admin app uses a dedicated key (separate from user `access_token`). */
export const LS_ADMIN_TOKEN_KEY = 'admin_token';

export type AdminTokenBody = {
  access_token?: string;
  AccessToken?: string;
  accessToken?: string;
};

export function readAccessTokenFromBody(
  data: AdminTokenBody | null | undefined,
): string | null {
  const v = data?.access_token ?? data?.AccessToken ?? data?.accessToken;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function getStoredAdminToken(): string | null {
  return localStorage.getItem(LS_ADMIN_TOKEN_KEY);
}

export function persistAdminToken(token: string): void {
  localStorage.setItem(LS_ADMIN_TOKEN_KEY, token);
}

export function clearAdminTokenStorage(): void {
  localStorage.removeItem(LS_ADMIN_TOKEN_KEY);
}
