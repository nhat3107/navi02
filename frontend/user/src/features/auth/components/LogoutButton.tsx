import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOutApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ROUTES } from '../../../shared/constants/routes';

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = '' }: LogoutButtonProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleConfirm = async () => {
    setSigningOut(true);
    try {
      await signOutApi();
    } catch {
      /* still clear local session */
    }
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 sm:px-3 ${className}`.trim()}
        aria-label="Sign out"
      >
        <LogOutIcon className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">Sign out</span>
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !signingOut && setConfirmOpen(false)}
        onConfirm={() => void handleConfirm()}
        title="Sign out?"
        message="You'll need to sign in again to access your account, messages, and notifications."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        confirming={signingOut}
      />
    </>
  );
}
