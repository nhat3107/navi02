import { Link, Navigate, useLocation } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[radial-gradient(ellipse_at_20%_50%,_var(--color-accent-bg)_0%,_transparent_50%),radial-gradient(ellipse_at_80%_20%,_rgba(139,92,246,0.04)_0%,_transparent_50%)] bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] max-[480px]:border-none max-[480px]:shadow-none max-[480px]:bg-transparent max-[480px]:px-5">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 -tracking-wide mb-1">
            Verify your email
          </h1>
          <p className="text-[0.935rem] text-slate-500 dark:text-slate-400">
            Enter the code we sent you to finish signing up
          </p>
        </div>

        <VerifyOtpForm email={email} />

        <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
          Wrong address?{' '}
          <Link to={ROUTES.REGISTER}>Go back</Link>
        </p>
      </div>
    </div>
  );
}
