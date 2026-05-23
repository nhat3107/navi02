export { useOAuthRedirect } from './useOAuthRedirect';

/**
 * OAuth redirect URL chứa `access_token` (query); handler toàn cục đọc và set session (refresh = cookie).
 * Hook này no-op để route `/oauth/callback` vẫn mount.
 */
export function useOAuthCallback() {
  /* handled globally */
}
