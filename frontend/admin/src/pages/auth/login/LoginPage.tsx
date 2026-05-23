import { LoginForm } from './LoginForm';
import { AuthLayout } from '../../../shared/layout/AuthLayout';

export function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Use your admin credentials to access the moderation console."
    >
      <LoginForm />
    </AuthLayout>
  );
}
