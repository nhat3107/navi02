import { Link } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';
import { SocialLoginButtons } from '../../../features/auth/components/SocialLoginButtons';
import { AuthLayout } from '../../../shared/layout/AuthLayout';
import { ROUTES } from '../../../shared/constants/routes';

export function RegisterPage() {
  return (
    <AuthLayout
      title="Create account"
      description="Sign up to get started on Navi"
    >
      <RegisterForm />
      <SocialLoginButtons />

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}
