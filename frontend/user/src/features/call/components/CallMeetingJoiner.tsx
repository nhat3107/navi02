import { useEffect, useRef } from 'react';
import { useMeeting } from '@videosdk.live/react-sdk';
import { useCallStore } from '../store/call.store';
import { releaseCallMedia } from '../lib/callMediaCleanup';

/**
 * Keeps a single VideoSDK join alive for the whole `activeSession`, regardless
 * of whether `/call` is mounted.
 *
 * Important: never call `leave()` from this effect's re-run cleanup — VideoSDK
 * may change the `join` function identity after connect, which would otherwise
 * leave immediately and tear down the session via `onMeetingLeft`.
 * Leave only runs when this component unmounts (session cleared / provider gone).
 */
export function CallMeetingJoiner() {
  const session = useCallStore((s) => s.activeSession);
  const { join, leave } = useMeeting();
  const joinedMeetingIdRef = useRef<string | null>(null);
  const joinRef = useRef(join);
  const leaveRef = useRef(leave);
  joinRef.current = join;
  leaveRef.current = leave;

  useEffect(() => {
    if (!session) return;

    const meetingId = session.meetingId;
    if (joinedMeetingIdRef.current === meetingId) return;

    const previousMeetingId = joinedMeetingIdRef.current;
    joinedMeetingIdRef.current = meetingId;

    if (previousMeetingId) {
      try {
        leaveRef.current();
      } catch {
        /* switching calls */
      }
      releaseCallMedia();
    }

    try {
      joinRef.current();
    } catch {
      /* SDK rejects duplicate joins */
    }
  }, [session?.meetingId]);

  useEffect(() => {
    return () => {
      if (!joinedMeetingIdRef.current) return;
      try {
        leaveRef.current();
      } catch {
        /* SDK may already be tearing down */
      }
      releaseCallMedia();
      joinedMeetingIdRef.current = null;
    };
  }, []);

  return null;
}
