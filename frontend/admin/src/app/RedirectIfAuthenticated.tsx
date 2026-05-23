import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth.store';
import { ROUTES } from '../shared/constants/routes';

export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}
