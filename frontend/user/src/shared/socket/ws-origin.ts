/** WebSocket origin (gateway) — same logic as chat socket. */
export function wsOriginFromEnv(): string {
  const explicit = import.meta.env.VITE_WS_ORIGIN?.replace(/\/$/, '');
  if (explicit) return explicit;
  const api = (
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
  ).replace(/\/$/, '');
  if (api.endsWith('/api')) return api.slice(0, -4) || api;
  return api;
}
