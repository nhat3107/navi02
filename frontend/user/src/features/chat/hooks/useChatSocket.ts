import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../../shared/socket/SocketProvider';
import type { ChatMessage } from '../types';

export type ChatTypingPayload = {
  from: string;
  conversationId?: string;
};

export type ChatGroupUpdatedPayload = {
  conversationId: string;
  action: 'leave' | 'members_added';
  userId?: string;
  conversation?: import('../types').ConversationListItem;
};

type Handlers = {
  onReceive?: (message: ChatMessage) => void;
  onTyping?: (payload: ChatTypingPayload) => void;
  onGroupUpdated?: (payload: ChatGroupUpdatedPayload) => void;
};

export function useChatSocket(handlers: Handlers = {}) {
  const socket = useSocket();
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Handlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return;
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onReceive = (payload: { message: ChatMessage }) => {
      handlersRef.current.onReceive?.(payload.message);
    };
    const onTyping = (payload: ChatTypingPayload) => {
      handlersRef.current.onTyping?.(payload);
    };
    const onGroupUpdated = (payload: ChatGroupUpdatedPayload) => {
      handlersRef.current.onGroupUpdated?.(payload);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceive);
    socket.on('typing', onTyping);
    socket.on('group_updated', onGroupUpdated);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceive);
      socket.off('typing', onTyping);
      socket.off('group_updated', onGroupUpdated);
    };
  }, [socket]);

  const emitTyping = useCallback(
    (opts: { to?: string; toUsers?: string[]; conversationId?: string }) => {
      socket?.emit('typing', opts);
    },
    [socket],
  );

  return { connected, emitTyping, socket };
}
