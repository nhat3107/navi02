import { useMemo, type ReactNode } from 'react';
import { MeetingProvider } from '@videosdk.live/react-sdk';
import { useCallStore } from '../store/call.store';
import { CallMeetingJoiner } from './CallMeetingJoiner';

/**
 * Lifts `MeetingProvider` to the app root so a live call survives navigation
 * between routes. Requirement (CALL_OPTIMIZATION.md §1):
 *
 * > Users should be able to switch between chat and call without disrupting
 * > the call session.
 *
 * Without this, navigating from `/call` to `/chat` (or any other route) would
 * unmount the provider, which calls `leave()` and tears the meeting down.
 *
 * Behavior:
 *   - No `activeSession` → render children unchanged (no SDK overhead).
 *   - `activeSession` set → wrap children in a stable `MeetingProvider` keyed
 *     by `meetingId`. The provider is shared across `/chat`, `/call`, and the
 *     `MiniCallBar`, so any consumer can call `useMeeting()` without a fresh
 *     join.
 *   - When the session clears (call ended), the provider unmounts and the SDK
 *     finishes its own teardown.
 *
 * `reinitialiseMeetingOnConfigChange={false}` keeps us safe from accidental
 * remounts on memo invalidation; the `key={meetingId}` is the only thing that
 * forces a fresh provider, exactly when it should.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const session = useCallStore((s) => s.activeSession);

  const meetingConfig = useMemo(() => {
    if (!session) return null;
    return {
      meetingId: session.meetingId,
      name: session.displayName,
      micEnabled: true,
      webcamEnabled: session.callType === 'video',
      debugMode: false,
      multiStream: false,
    };
  }, [session?.meetingId, session?.displayName, session?.callType]);

  if (!session || !meetingConfig) {
    return <>{children}</>;
  }

  return (
    <MeetingProvider
      key={session.meetingId}
      token={session.token}
      config={meetingConfig}
      reinitialiseMeetingOnConfigChange={false}
    >
      <CallMeetingJoiner />
      {children}
    </MeetingProvider>
  );
}
