import { type FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordApi } from '../../../features/auth/api/auth.api';
import { AuthInput } from '../../../features/auth/components/AuthInput';
import { AuthAlert } from '../../../features/auth/components/AuthAlert';
import { AuthFooter, AuthFooterLink } from '../../../features/auth/components/AuthFooter';
import { Button } from '../../../shared/components/Button';
import { AuthLayout } from '../../../shared/layout/AuthLayout';
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
    <AuthLayout
      eyebrow="Account recovery"
      title={done ? 'Password updated' : 'New password'}
      description={
        done
          ? 'Your password has been changed successfully.'
          : `Choose a strong password (${PASSWORD_MIN_LEN}–${PASSWORD_MAX_LEN} characters).`
      }
      footer={
        <AuthFooter>
          <AuthFooterLink to={ROUTES.LOGIN}>Back to sign in</AuthFooterLink>
        </AuthFooter>
      }
    >
      {done ? (
        <div className="auth-success-panel">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            You can sign in with your new password now.
          </p>
          <Link to={ROUTES.LOGIN} className="auth-footer__link inline-block">
            Go to sign in
          </Link>
        </div>
      ) : !hasToken ? (
        <div className="auth-alert auth-alert--info">
          <p className="mb-3">
            This page needs a valid reset link from your email. The link may be
            incomplete or expired.
          </p>
          <Link to={ROUTES.FORGOT_PASSWORD} className="auth-footer__link">
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {bannerError ? <AuthAlert>{bannerError}</AuthAlert> : null}
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
          <Button type="submit" variant="primary" loading={loading}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
