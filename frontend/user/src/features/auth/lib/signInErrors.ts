import type { AxiosError } from 'axios';

export function extractApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const axiosErr = err as AxiosError<{ message?: string | string[] }>;
  const raw = axiosErr.response?.data?.message;
  if (Array.isArray(raw)) {
    const joined = raw.map(String).join(' ').trim();
    if (joined) return joined;
  }
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (axiosErr.message?.trim()) return axiosErr.message.trim();
  return fallback;
}

export function isUnverifiedSignIn403(
  status: number | undefined,
  message: string,
): boolean {
  if (status !== 403) return false;
  return /email not verified|verify your email/i.test(message);
}

export function isBlockedSignIn403(
  status: number | undefined,
  message: string,
): boolean {
  if (status !== 403) return false;
  return /blocked|restricted/i.test(message);
}

export function blockedSignInToastMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed) return trimmed;
  return 'Your account is temporarily blocked. Try again later or contact support.';
}
