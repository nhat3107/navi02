import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCallStore } from '../store/call.store';
import { reloadToChat } from '../lib/callMediaCleanup';
import { ROUTES } from '../../../shared/constants/routes';

/**
 * When a call ends while the user is on a route other than `/call`, there is
 * no `CallEndedScreen`. Reload to chat so the camera indicator clears and
 * call state resets for everyone (1:1 remote hang-up, group "end for everyone",
 * reject, etc.).
 */
export function CallSessionLifecycle() {
  const activeSession = useCallStore((s) => s.activeSession);
  const lastEnded = useCallStore((s) => s.lastEnded);
  const setLastEnded = useCallStore((s) => s.setLastEnded);
  const location = useLocation();

  useEffect(() => {
    if (activeSession || !lastEnded) return;
    if (location.pathname === ROUTES.CALL) return;

    const timer = window.setTimeout(() => {
      setLastEnded(null);
      reloadToChat(ROUTES.CHAT);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [activeSession, lastEnded, location.pathname, setLastEnded]);

  return null;
}
