import { useOAuthCallback } from '../../../features/auth/hooks/useOAuth';
import { AuthLoadingState } from '../../../shared/layout/AuthLayout';
// Test CI 
export function OAuthCallback() {
  useOAuthCallback();

  return <AuthLoadingState label="Signing you in…" />;
}
