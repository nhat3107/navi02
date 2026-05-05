import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallStore } from '../../features/call/store/call.store';
import { ROUTES } from '../../shared/constants/routes';
import { MeetingRoomShell } from './MeetingRoomShell';
import { CallEndedScreen } from './CallEndedScreen';

/**
 * Renders the live meeting UI. The actual `MeetingProvider` lives at the app
 * root (see `CallProvider`) so the meeting stays alive when the user navigates
 * to /chat and back. This page just decides what to show:
 *
 *   - active session  → `<MeetingRoomShell />`
 *   - just ended      → `<CallEndedScreen />` (auto-redirects after a beat)
 *   - nothing at all  → bounce back to /chat
 */
export function CallRoomPage() {
  const session = useCallStore((s) => s.activeSession);
  const lastEnded = useCallStore((s) => s.lastEnded);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) return;
    if (lastEnded) return; // ended screen will navigate when its timer fires
    navigate(ROUTES.CHAT, { replace: true });
  }, [session, lastEnded, navigate]);

  if (session) return <MeetingRoomShell />;
  if (lastEnded) return <CallEndedScreen info={lastEnded} />;
  return null;
}
