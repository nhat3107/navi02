import type { Request, Response } from 'express';

/** HttpOnly refresh cookie (rotation). Legacy names still read/cleared for migration. */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
const LEGACY_REFRESH_TOKEN_COOKIE_NAMES = ['RefreshToken', 'refreshToken'] as const;

const COOKIE_PATH = '/';
const REFRESH_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000;

function cookieOptions(sameSite: 'strict' | 'lax') {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite,
    maxAge: REFRESH_MAX_AGE_MS,
    path: COOKIE_PATH,
  } as const;
}

/** API sets refresh token; browser stores it — never expose to JS. */
export function attachRefreshTokenCookie(
  res: Response,
  refreshToken: string,
  sameSite: 'strict' | 'lax',
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(sameSite));
}

export function readRefreshTokenCookie(req: Request): string | undefined {
  const c = req.cookies as Record<string, string | undefined> | undefined;
  if (!c) return undefined;
  const primary = c[REFRESH_TOKEN_COOKIE];
  if (primary) return primary;
  for (const name of LEGACY_REFRESH_TOKEN_COOKIE_NAMES) {
    const v = c[name];
    if (v) return v;
  }
  return undefined;
}

/** Clear primary + legacy cookie names for each SameSite variant we may have set. */
export function clearRefreshTokenCookies(res: Response): void {
  for (const sameSite of ['strict', 'lax'] as const) {
    const opt = { ...cookieOptions(sameSite) };
    res.clearCookie(REFRESH_TOKEN_COOKIE, opt);
    for (const name of LEGACY_REFRESH_TOKEN_COOKIE_NAMES) {
      res.clearCookie(name, opt);
    }
  }
}
