import { type FormEvent, useState } from 'react';
import { AuthInput } from '../../../features/auth/components/AuthInput';
import { Button } from '../../../shared/components/Button';
import { useVerifyOtp } from '../../../features/auth/hooks/useVerifyOtp';

interface VerifyOtpFormProps {
  email: string;
}

export function VerifyOtpForm({ email }: VerifyOtpFormProps) {
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<{ otp?: string }>({});
  const { verify, resend, loading, resendLoading, error } = useVerifyOtp(email);

  const validate = (): boolean => {
    const next: typeof errors = {};
    const trimmed = otp.trim();
    if (!trimmed) {
      next.otp = 'Enter the code from your email';
    } else if (trimmed.length < 4) {
      next.otp = 'Code looks too short';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      verify(otp.trim());
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="px-3.5 py-2.5 bg-error-bg text-error rounded-lg text-sm font-medium text-center">
          {error}
        </div>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
        We sent a verification code to{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {email}
        </span>
      </p>

      <AuthInput
        label="Verification code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6-digit code"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
        error={errors.otp}
      />

      <Button type="submit" variant="primary" loading={loading} className="mt-1">
        Verify email
      </Button>

      <Button
        type="button"
        variant="secondary"
        loading={resendLoading}
        onClick={() => resend()}
      >
        Resend code
      </Button>
    </form>
  );
}
