import type { AxiosError } from 'axios';

/** NestJS-style `message`: string or validation array */
export function extractApiMessage(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{
    message?: string | string[];
    error?: string;
  }>;
  const m = ax.response?.data?.message;
  if (Array.isArray(m)) return m.filter(Boolean).join(', ');
  if (typeof m === 'string' && m.trim()) return m.trim();
  const e = ax.response?.data?.error;
  if (typeof e === 'string' && e.trim()) return e.trim();
  if (!ax.response && ax.message) return ax.message;
  return fallback;
}
