import { useCallback } from 'react';
import { useSocket } from '../../../shared/socket/SocketProvider';
import type { CallType } from '../types/call.types';

export function useCallSocket() {
  const socket = useSocket();

  const emitCallUser = useCallback(
    (payload: {
      to?: string;
      toUsers?: string[];
      meetingId: string;
      conversationId?: string;
      callType: CallType;
      isGroupCall?: boolean;
      callerName?: string;
    }) => {
      socket?.emit('call_user', payload);
    },
    [socket],
  );

  const emitAcceptCall = useCallback(
    (payload: { to: string; meetingId: string }) => {
      socket?.emit('accept_call', payload);
    },
    [socket],
  );

  const emitRejectCall = useCallback(
    (payload: { to: string; meetingId: string }) => {
      socket?.emit('reject_call', payload);
    },
    [socket],
  );

  const emitEndCall = useCallback(
    (payload: {
      to?: string;
      toUsers?: string[];
      meetingId: string;
      /** Group only: terminate the meeting for every participant. */
      forEveryone?: boolean;
    }) => {
      socket?.emit('end_call', payload);
    },
    [socket],
  );

  return {
    socket,
    emitCallUser,
    emitAcceptCall,
    emitRejectCall,
    emitEndCall,
  };
}
