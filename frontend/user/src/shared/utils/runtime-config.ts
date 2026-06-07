declare global {
  interface Window {
    __NAVI_CONFIG__?: {
      apiUrl?: string;
      wsOrigin?: string;
    };
  }
}

export function getApiBaseUrl(): string {
  const runtime = window.__NAVI_CONFIG__?.apiUrl?.trim();
  if (runtime) return runtime.replace(/\/$/, '');

  const built = import.meta.env.VITE_API_URL?.trim();
  if (built) return built.replace(/\/$/, '');

  return 'http://localhost:3000/api';
}

export function getWsOrigin(): string {
  const runtime = window.__NAVI_CONFIG__?.wsOrigin?.trim();
  if (runtime) return runtime.replace(/\/$/, '');

  const explicit = import.meta.env.VITE_WS_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const api = getApiBaseUrl().replace(/\/$/, '');
  if (api.endsWith('/api')) return api.slice(0, -4) || api;
  return api;
}
