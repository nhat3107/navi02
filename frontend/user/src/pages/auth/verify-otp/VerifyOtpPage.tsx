import { Navigate, useLocation } from 'react-router-dom';
import { AuthFooter, AuthFooterLink } from '../../../features/auth/components/AuthFooter';
import { AuthLayout } from '../../../shared/layout/AuthLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { VerifyOtpForm } from './VerifyOtpForm';

type LocationState = { email?: string };

export function VerifyOtpPage() {
  const location = useLocation();
  const email = (location.state as LocationState | null)?.email;

  if (!email) {
    return <Navigate to={ROUTES.REGISTER} replace />;
  }

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Verify your email"
      description="Enter the code we sent you to finish signing up"
      footer={
        <AuthFooter>
          Wrong address?{' '}
          <AuthFooterLink to={ROUTES.REGISTER}>Go back</AuthFooterLink>
        </AuthFooter>
      }
    >
      <VerifyOtpForm email={email} />
    </AuthLayout>
  );
}
