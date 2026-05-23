import { RegisterForm } from './RegisterForm';
import { SocialLoginButtons } from '../../../features/auth/components/SocialLoginButtons';
import { AuthFooter, AuthFooterLink } from '../../../features/auth/components/AuthFooter';
import { AuthLayout } from '../../../shared/layout/AuthLayout';
import { ROUTES } from '../../../shared/constants/routes';

export function RegisterPage() {
  return (
    <AuthLayout
      title="Create account"
      description="Sign up to get started on Navi"
      footer={
        <AuthFooter>
          Already have an account?{' '}
          <AuthFooterLink to={ROUTES.LOGIN}>Sign in</AuthFooterLink>
        </AuthFooter>
      }
    >
      <RegisterForm />
      <SocialLoginButtons />
    </AuthLayout>
  );
}
