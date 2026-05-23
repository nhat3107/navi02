import { type FormEvent, useState } from 'react';
import { AuthInput } from '../../../features/auth/components/AuthInput';
import { Button } from '../../../shared/components/Button';
import { useLogin } from '../../../features/auth/hooks/useLogin';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>(
    {},
  );
  const { login, loading, error } = useLogin();

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!username.trim()) {
      next.username = 'Username is required';
    }
    if (!password) {
      next.password = 'Password is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      login({ username: username.trim(), password });
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {error ? <div className="alert alert--error">{error}</div> : null}

      <AuthInput
        label="Username"
        type="text"
        placeholder="admin@example.com"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errors.username}
        autoComplete="username"
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        autoComplete="current-password"
      />

      <Button type="submit" loading={loading}>
        Sign in
      </Button>
    </form>
  );
}
