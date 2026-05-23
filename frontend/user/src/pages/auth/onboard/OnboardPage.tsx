import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { OnboardAvatarStep } from './OnboardAvatarStep';
import { OnboardForm } from './OnboardForm';
import { AuthLayout, AuthLoadingState } from '../../../shared/layout/AuthLayout';
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
    return <AuthLoadingState label="Checking your profile…" />;
  }

  return (
    <AuthLayout
      eyebrow="Welcome"
      title={step === 1 ? 'Profile photo' : 'Set up your profile'}
      description={
        step === 1
          ? 'Optional — skip if you prefer to add one later.'
          : 'Tell us a bit about yourself so people recognize you.'
      }
      step={{ current: step, total: 2 }}
      wide
    >
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
        <OnboardForm avatarUrl={avatarUrl} onBackToPhoto={() => setStep(1)} />
      )}
    </AuthLayout>
  );
}
