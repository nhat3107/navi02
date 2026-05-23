import { useEffect } from 'react';
import { useSocket } from '../../../shared/socket/SocketProvider';
import { useCallStore } from '../store/call.store';
import { subscribeCallBroadcast } from '../lib/callBroadcast';
import type {
  IncomingCallPayload,
  CallEndedPayload,
  CallRejectedPayload,
} from '../types/call.types';

/**
 * Global listeners: incoming calls + remote hang-up + cross-tab BroadcastChannel
 * sync so every tab of the same user stays aligned on incoming / active-call
 * state.
 *
 * We never `navigate` from here — the call UI itself handles transitions:
 *   - On `call_ended` we record `lastEnded` and clear `activeSession`. The
 *     CallRoomPage shows the ended screen briefly, then redirects to /chat.
 *   - On `call_rejected` we do the same with `reason: 'rejected'`.
 */
export function CallSignalBridge() {
  const socket = useSocket();
  const setIncoming = useCallStore((s) => s.setIncoming);
  const setRemoteActiveMeetingId = useCallStore(
    (s) => s.setRemoteActiveMeetingId,
  );

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (p: IncomingCallPayload) => {
      const { remoteActiveMeetingId, activeSession } = useCallStore.getState();
      if (remoteActiveMeetingId && remoteActiveMeetingId === p.meetingId) return;
      if (activeSession && activeSession.meetingId === p.meetingId) return;
      setIncoming(p);
    };

    const onEnded = (p: CallEndedPayload) => {
      const {
        activeSession,
        setActiveSession,
        incoming,
        remoteActiveMeetingId,
        setLastEnded,
      } = useCallStore.getState();
      if (incoming?.meetingId === p.meetingId) {
        setIncoming(null);
      }
      if (remoteActiveMeetingId && remoteActiveMeetingId === p.meetingId) {
        setRemoteActiveMeetingId(null);
      }
      if (activeSession && p.meetingId === activeSession.meetingId) {
        setLastEnded({
          meetingId: p.meetingId,
          endedBy: p.endedBy,
          forEveryone: p.forEveryone === true,
          reason:
            p.forEveryone === true ? 'ended_for_everyone' : 'ended_by_remote',
        });
        setActiveSession(null);
      }
    };

    /** Spec: callee declines → caller may be sitting on /call waiting. */
    const onRejected = (p: CallRejectedPayload) => {
      const {
        activeSession,
        setActiveSession,
        incoming,
        remoteActiveMeetingId,
        setLastEnded,
      } = useCallStore.getState();
      if (incoming?.meetingId === p.meetingId) {
        setIncoming(null);
      }
      if (remoteActiveMeetingId && remoteActiveMeetingId === p.meetingId) {
        setRemoteActiveMeetingId(null);
      }
      if (activeSession && p.meetingId === activeSession.meetingId) {
        setLastEnded({
          meetingId: p.meetingId,
          endedBy: p.from,
          reason: 'rejected',
        });
        setActiveSession(null);
      }
    };

    socket.on('incoming_call', onIncoming);
    socket.on('call_ended', onEnded);
    socket.on('call_rejected', onRejected);
    return () => {
      socket.off('incoming_call', onIncoming);
      socket.off('call_ended', onEnded);
      socket.off('call_rejected', onRejected);
    };
  }, [socket, setIncoming, setRemoteActiveMeetingId]);

  useEffect(() => {
    return subscribeCallBroadcast((msg) => {
      const {
        incoming,
        setIncoming: setInc,
        activeSession,
        setActiveSession,
      } = useCallStore.getState();

      if (msg.type === 'incoming_cleared') {
        if (incoming?.meetingId === msg.meetingId) {
          setInc(null);
        }
        return;
      }

      if (msg.type === 'active_session_started') {
        if (incoming?.meetingId === msg.meetingId) {
          setInc(null);
        }
        if (activeSession?.meetingId !== msg.meetingId) {
          setRemoteActiveMeetingId(msg.meetingId);
        }
        return;
      }

      if (msg.type === 'active_session_ended') {
        const { remoteActiveMeetingId } = useCallStore.getState();
        if (remoteActiveMeetingId === msg.meetingId) {
          setRemoteActiveMeetingId(null);
        }
        if (activeSession?.meetingId === msg.meetingId) {
          setActiveSession(null);
        }
      }
    });
  }, [setRemoteActiveMeetingId]);

  return null;
}
