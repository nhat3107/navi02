import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCallStore } from '../store/call.store';
import { ROUTES } from '../../../shared/constants/routes';

function formatDuration(s: number): string {
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Persistent in-app indicator shown on every route EXCEPT `/call` whenever
 * an `activeSession` is set. Lets the user pop back into the call without
 * losing their place in chat (or wherever they navigated to).
 *
 * The bar is intentionally minimal — full controls live on `/call`.
 */
export function MiniCallBar() {
  const session = useCallStore((s) => s.activeSession);
  const location = useLocation();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [session?.meetingId]);

  if (!session) return null;
  if (location.pathname === ROUTES.CALL) return null;

  const label =
    session.callType === 'video' ? 'Video call in progress' : 'Audio call in progress';

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.CALL)}
      className="fixed left-1/2 top-3 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-full bg-emerald-600/95 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
      aria-label="Return to active call"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span className="font-mono text-xs tabular-nums opacity-90">
        {formatDuration(elapsed)}
      </span>
      <span className="hidden text-xs opacity-90 sm:inline">·</span>
      <span className="hidden text-xs underline-offset-2 hover:underline sm:inline">
        Return
      </span>
    </button>
  );
}
