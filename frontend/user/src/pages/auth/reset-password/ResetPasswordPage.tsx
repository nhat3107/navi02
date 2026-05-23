import { type FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordApi } from '../../../features/auth/api/auth.api';
import { AuthInput } from '../../../features/auth/components/AuthInput';
import { Button } from '../../../shared/components/Button';
import { ThemeToggleCorner } from '../../../shared/components/ThemeToggle';
import { ROUTES } from '../../../shared/constants/routes';
import {
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
} from '../../../shared/constants/validation';
import { extractApiMessage } from '../../../shared/utils/api-error';

function parseResetToken(raw: string | null): string {
  if (!raw?.trim()) return '';
  const t = raw.trim();
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => parseResetToken(searchParams.get('token')),
    [searchParams],
  );
  const hasToken = token.length > 0;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    setPasswordError(undefined);
    setConfirmError(undefined);

    if (!hasToken) {
      setBannerError(null);
      return false;
    }

    if (password.length < PASSWORD_MIN_LEN) {
      setPasswordError(`At least ${PASSWORD_MIN_LEN} characters`);
      return false;
    }
    if (password.length > PASSWORD_MAX_LEN) {
      setPasswordError(`At most ${PASSWORD_MAX_LEN} characters`);
      return false;
    }
    if (password !== confirm) {
      setConfirmError('Does not match the password above');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setDone(true);
    } catch (err) {
      setBannerError(
        extractApiMessage(err, 'Could not reset password. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-[radial-gradient(ellipse_at_20%_50%,_var(--color-accent-bg)_0%,_transparent_50%),radial-gradient(ellipse_at_80%_20%,_rgba(139,92,246,0.04)_0%,_transparent_50%)] bg-slate-50 dark:bg-slate-950">
      <ThemeToggleCorner />
      <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] max-[480px]:border-none max-[480px]:bg-transparent max-[480px]:shadow-none max-[480px]:px-5">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            New password
          </h1>
          <p className="text-[0.935rem] text-slate-500 dark:text-slate-400">
            Choose a strong password ({PASSWORD_MIN_LEN}–{PASSWORD_MAX_LEN}{' '}
            characters).
          </p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your password has been updated. You can sign in now.
            </p>
            <Link
              to={ROUTES.LOGIN}
              className="inline-block text-sm font-medium text-accent"
            >
              Sign in
            </Link>
          </div>
        ) : !hasToken ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This page needs a valid reset link from your email. The link may
              be incomplete or expired.
            </p>
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="inline-block text-sm font-medium text-accent"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {bannerError && (
              <div className="rounded-lg bg-error-bg px-3.5 py-2.5 text-center text-sm font-medium text-error">
                {bannerError}
              </div>
            )}
            <AuthInput
              label="New password"
              type="password"
              placeholder={`${PASSWORD_MIN_LEN}+ characters`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(undefined);
                if (bannerError) setBannerError(null);
              }}
              error={passwordError}
              autoComplete="new-password"
              disabled={loading}
            />
            <AuthInput
              label="Confirm password"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (confirmError) setConfirmError(undefined);
                if (bannerError) setBannerError(null);
              }}
              error={confirmError}
              autoComplete="new-password"
              disabled={loading}
            />
            <Button type="submit" variant="primary" loading={loading} className="mt-1">
              Update password
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link to={ROUTES.LOGIN}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
