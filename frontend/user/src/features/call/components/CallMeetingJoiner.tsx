import { useEffect, useRef } from 'react';
import { useMeeting } from '@videosdk.live/react-sdk';
import { useCallStore } from '../store/call.store';
import { releaseCallMedia } from '../lib/callMediaCleanup';

/**
 * Keeps a single VideoSDK join alive for the whole `activeSession`, regardless
 * of whether `/call` is mounted. Without this, leaving the call page runs
 * MeetingRoomShell's cleanup → `leave()`, then "Return" runs `join()` again
 * and the same user appears twice in the room.
 *
 * On unmount (session cleared or provider torn down) we always call `leave()`
 * and stop local media tracks so remote hang-up / socket `call_ended` paths
 * release the camera even when `MeetingRoomShell` never runs `safeLeave()`.
 */
export function CallMeetingJoiner() {
  const session = useCallStore((s) => s.activeSession);
  const { join, leave } = useMeeting();
  const joinedMeetingIdRef = useRef<string | null>(null);
  const leaveRef = useRef(leave);
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
      join();
    } catch {
      /* SDK rejects duplicate joins */
    }

    return () => {
      if (joinedMeetingIdRef.current !== meetingId) return;
      try {
        leaveRef.current();
      } catch {
        /* SDK may already be tearing down */
      }
      releaseCallMedia();
      joinedMeetingIdRef.current = null;
    };
  }, [session?.meetingId, join]);

  return null;
}
