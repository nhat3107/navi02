import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth.store';
import { ROUTES } from '../shared/constants/routes';

/** Redirect guests to login; allow authenticated users through. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
