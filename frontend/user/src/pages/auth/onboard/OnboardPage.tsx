import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { OnboardAvatarStep } from './OnboardAvatarStep';
import { OnboardForm } from './OnboardForm';
import { ThemeToggleCorner } from '../../../shared/components/ThemeToggle';
import { useAuthStore } from '../../../features/auth/store/auth.store';
import { getProfileApi } from '../../../features/auth/api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';

export function OnboardPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setCheckingProfile(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await getProfileApi();
        if (!cancelled) navigate(ROUTES.HOME, { replace: true });
      } catch (e) {
        const status = (e as { response?: { status?: number } }).response
          ?.status;
        if (status === 401 && !cancelled) {
          navigate(ROUTES.LOGIN, { replace: true });
        }
      } finally {
        if (!cancelled) setCheckingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-[radial-gradient(ellipse_at_20%_50%,_var(--color-accent-bg)_0%,_transparent_50%),radial-gradient(ellipse_at_80%_20%,_rgba(139,92,246,0.04)_0%,_transparent_50%)] bg-slate-50 dark:bg-slate-950">
      <ThemeToggleCorner />
      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] max-[480px]:border-none max-[480px]:shadow-none max-[480px]:bg-transparent max-[480px]:px-5">
        <div className="text-center mb-8">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
            Step {step} of 2
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 -tracking-wide mb-1">
            {step === 1 ? 'Profile photo' : 'Set up your profile'}
          </h1>
          <p className="text-[0.935rem] text-slate-500 dark:text-slate-400">
            {step === 1
              ? 'Optional — skip if you prefer to add one later.'
              : 'Tell us a bit about yourself'}
          </p>
        </div>

        {step === 1 ? (
          <OnboardAvatarStep
            existingAvatarUrl={avatarUrl}
            onSkip={() => setStep(2)}
            onUploaded={(url) => {
              setAvatarUrl(url);
              setStep(2);
            }}
          />
        ) : (
          <OnboardForm
            avatarUrl={avatarUrl}
            onBackToPhoto={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
}
