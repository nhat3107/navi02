import { type FormEvent, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgetPasswordApi } from '../../../features/auth/api/auth.api';
import { AuthInput } from '../../../features/auth/components/AuthInput';
import { Button } from '../../../shared/components/Button';
import { AuthLayout } from '../../../shared/layout/AuthLayout';
import { AUTH_EMAIL_REGEX } from '../../../shared/constants/validation';
import { ROUTES } from '../../../shared/constants/routes';
import { extractApiMessage } from '../../../shared/utils/api-error';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = useCallback((): boolean => {
    const v = email.trim();
    if (!v) {
      setEmailError('Email is required');
      return false;
    }
    if (!AUTH_EMAIL_REGEX.test(v)) {
      setEmailError('Enter a valid email');
      return false;
    }
    setEmailError(undefined);
    return true;
  }, [email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    if (!validateEmail()) return;

    setLoading(true);
    try {
      const { message } = await forgetPasswordApi(email);
      setSuccessMessage(
        message.trim() ||
          'If an account exists for this email, you will receive reset instructions shortly.',
      );
    } catch (err) {
      setBannerError(
        extractApiMessage(err, 'Could not send reset email. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      description="We'll email a reset link only for addresses with a verified account."
    >
      {successMessage ? (
        <div className="space-y-4 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {successMessage}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Check spam or promotions folder if you don&apos;t see it within a
            few minutes.
          </p>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {bannerError && (
            <div className="rounded-xl bg-error-bg px-3.5 py-2.5 text-center text-sm font-medium text-error">
              {bannerError}
            </div>
          )}
          <AuthInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(undefined);
              if (bannerError) setBannerError(null);
            }}
            error={emailError}
            autoComplete="email"
            disabled={loading}
          />
          <Button type="submit" variant="primary" loading={loading} className="mt-1">
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to={ROUTES.LOGIN}>Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
