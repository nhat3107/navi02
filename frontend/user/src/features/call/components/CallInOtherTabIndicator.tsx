import { useLocation } from 'react-router-dom';
import { useCallStore } from '../store/call.store';
import { ROUTES } from '../../../shared/constants/routes';

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
  // If THIS tab is the one in the call, don't show the indicator.
  if (activeSession?.meetingId === remoteActiveMeetingId) return null;
  if (location.pathname === ROUTES.CALL) return null;

  return (
    <div className="fixed top-4 left-1/2 z-[90] w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-2.5 shadow-lg shadow-emerald-900/10 backdrop-blur-md dark:border-emerald-700/60 dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
            Call in progress in another tab
          </p>
          <p className="truncate text-[0.7rem] text-slate-500 dark:text-slate-400">
            Switch to that tab to continue the conversation
          </p>
        </div>
      </div>
    </div>
  );
}
