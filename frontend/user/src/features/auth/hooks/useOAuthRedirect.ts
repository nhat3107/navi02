import { getOAuthUrl } from '../api/auth.api';

export function useOAuthRedirect() {
  const redirectTo = (provider: 'google' | 'github') => {
    window.location.href = getOAuthUrl(provider);
  };
  return { redirectTo };
}
