export function decodeJwtPayload<T extends Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
