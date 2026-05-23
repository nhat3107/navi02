import { useOAuthCallback } from '../../../features/auth/hooks/useOAuth';
import { AuthLoadingState } from '../../../shared/layout/AuthLayout';

export function OAuthCallback() {
  useOAuthCallback();

  return <AuthLoadingState label="Signing you in…" />;
}
