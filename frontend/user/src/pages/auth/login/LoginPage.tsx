import { Link } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { SocialLoginButtons } from '../../../features/auth/components/SocialLoginButtons';
import { ToastContainer } from '../../../shared/components/ToastContainer';
import { useOAuthLoginErrorToast } from '../../../features/auth/hooks/useOAuthLoginErrorToast';
import { AuthLayout } from '../../../shared/layout/AuthLayout';
import { ROUTES } from '../../../shared/constants/routes';

export function LoginPage() {
  useOAuthLoginErrorToast();

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your account to continue"
    >
      <div className="mb-4">
        <ToastContainer surface="login" />
      </div>

      <LoginForm />
      <SocialLoginButtons />

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.REGISTER}>Create one</Link>
      </p>
    </AuthLayout>
  );
}
