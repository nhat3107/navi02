import { useLocation } from 'react-router-dom';
import { useCallStore } from '../store/call.store';
import { ROUTES } from '../../../shared/constants/routes';

function WindowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.5h10.5M6.75 12h10.5m-10.5 4.5h10.5M3.75 6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z"
      />
    </svg>
  );
}

/**
 * Small passive indicator shown when *another tab of the same user* is
 * currently in a call. Helps the user understand why no incoming banner is
 * showing on this tab (sibling tab already picked the call up) and where to
 * find the active call. Does not render on the /call route itself.
 */
export function CallInOtherTabIndicator() {
  const remoteActiveMeetingId = useCallStore((s) => s.remoteActiveMeetingId);
  const activeSession = useCallStore((s) => s.activeSession);
  const location = useLocation();

  if (!remoteActiveMeetingId) return null;
  if (activeSession?.meetingId === remoteActiveMeetingId) return null;
  if (location.pathname === ROUTES.CALL) return null;

  return (
    <div className="call-other-tab-banner" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-emerald-400/25" />
          <WindowIcon className="relative h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            Call active in another tab
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            Switch to that tab to return to the conversation
          </p>
        </div>
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      </div>
    </div>
  );
}
