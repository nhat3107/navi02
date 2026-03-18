import { useOAuthCallback } from '../../../features/auth/hooks/useOAuth';
import { Spinner } from '../../../shared/components/Spinner';

export function OAuthCallback() {
  useOAuthCallback();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <Spinner size={32} />
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Signing you in...
        </p>
      </div>
    </div>
  );
}
