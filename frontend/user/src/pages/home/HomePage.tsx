import { useAuthStore } from '../../features/auth/store/auth.store';
import { Button } from '../../shared/components/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';

export function HomePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100 -tracking-wide mb-2">
            Welcome
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Please sign in to continue.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={() => navigate(ROUTES.LOGIN)} className="w-auto">
              Sign in
            </Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.REGISTER)} className="w-auto">
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100 -tracking-wide mb-2">
          Welcome back
        </h1>
        {user?.email && (
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Signed in as <strong className="text-accent">{user.email}</strong>
          </p>
        )}
        <div className="mt-6">
          <Button variant="secondary" onClick={handleLogout} className="w-auto">
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
