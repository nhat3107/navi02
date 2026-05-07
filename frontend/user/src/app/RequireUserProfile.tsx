import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfileApi } from '../features/auth/api/auth.api';
import { useAuthStore } from '../features/auth/store/auth.store';
import { ROUTES } from '../shared/constants/routes';
import type { AxiosError } from 'axios';

/**
 * Guests: render children as-is.
 * Authenticated: require an existing user profile (GET /user/profile !== 404), else redirect to onboarding.
 */
export function RequireUserProfile({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready'>('idle');

  useEffect(() => {
    if (!isAuthenticated) {
      setPhase('ready');
      return;
    }

    let cancelled = false;
    setPhase('loading');

    void (async () => {
      try {
        await getProfileApi();
        if (!cancelled) setPhase('ready');
      } catch (e) {
        const status = (e as AxiosError).response?.status;
        if (status === 404) {
          if (!cancelled) navigate(ROUTES.ONBOARD, { replace: true });
          return;
        }
        if (status === 401) {
          if (!cancelled) navigate(ROUTES.LOGIN, { replace: true });
          return;
        }
        if (!cancelled) setPhase('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (phase === 'loading' || phase === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
