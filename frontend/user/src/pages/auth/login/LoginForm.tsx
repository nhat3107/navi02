import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthInput } from '../../../features/auth/components/AuthInput';
import { ROUTES } from '../../../shared/constants/routes';
import { AUTH_EMAIL_REGEX } from '../../../shared/constants/validation';
import { Button } from '../../../shared/components/Button';
import { useLogin } from '../../../features/auth/hooks/useLogin';
import { loginToast } from '../../../shared/store/toast.store';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const { login, loading } = useLogin();

  const validate = (): string | null => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!AUTH_EMAIL_REGEX.test(email)) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return newErrors.email ?? newErrors.password ?? null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      loginToast(validationError);
      return;
    }
    void login({ email, password });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <AuthInput
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoComplete="email"
      />

      <div className="space-y-1.5">
        <AuthInput
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" variant="primary" loading={loading} className="mt-1">
        Sign in
      </Button>
    </form>
  );
}
