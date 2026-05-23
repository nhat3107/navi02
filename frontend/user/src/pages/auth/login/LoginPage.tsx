import { LoginForm } from './LoginForm';
import { SocialLoginButtons } from '../../../features/auth/components/SocialLoginButtons';
import { AuthFooter, AuthFooterLink } from '../../../features/auth/components/AuthFooter';
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
      footer={
        <AuthFooter>
          Don&apos;t have an account?{' '}
          <AuthFooterLink to={ROUTES.REGISTER}>Create one</AuthFooterLink>
        </AuthFooter>
      }
    >
      <div className="mb-1">
        <ToastContainer surface="login" />
      </div>
      <LoginForm />
      <SocialLoginButtons />
    </AuthLayout>
  );
}
