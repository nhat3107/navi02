import { useEffect, useRef } from 'react';
import { useMeeting } from '@videosdk.live/react-sdk';
import { useCallStore } from '../store/call.store';
import { releaseLocalMediaTracks } from '../lib/releaseCallMedia';
import {
  registerMeetingLeave,
  unregisterMeetingLeave,
} from '../lib/meetingLeaveRegistry';

/**
 * Keeps a single VideoSDK join alive for the whole `activeSession`, regardless
 * of whether `/call` is mounted. Without this, leaving the call page runs
 * MeetingRoomShell's cleanup → `leave()`, then "Return" runs `join()` again
 * and the same user appears twice in the room.
 */
export function CallMeetingJoiner() {
  const session = useCallStore((s) => s.activeSession);
  const { join, leave } = useMeeting();
  const joinedMeetingIdRef = useRef<string | null>(null);
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  const disconnectMeeting = () => {
    if (!joinedMeetingIdRef.current) return;
    try {
      leaveRef.current();
    } catch {
      /* SDK may already be tearing down */
    }
    releaseLocalMediaTracks();
    joinedMeetingIdRef.current = null;
  };

  useEffect(() => {
    registerMeetingLeave(() => {
      try {
        leaveRef.current();
      } catch {
        /* SDK may already be tearing down */
      }
      releaseLocalMediaTracks();
    });
    return () => {
      unregisterMeetingLeave();
      disconnectMeeting();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      disconnectMeeting();
      return;
    }

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
      releaseLocalMediaTracks();
    }

    try {
      join();
    } catch {
      /* SDK rejects duplicate joins */
    }
  }, [session?.meetingId, join]);

  return null;
}
