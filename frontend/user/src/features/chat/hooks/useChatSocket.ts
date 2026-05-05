import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../../shared/socket/SocketProvider';
import type { ChatMessage } from '../types';

export type ChatTypingPayload = {
  from: string;
  conversationId?: string;
};

type Handlers = {
  onReceive?: (message: ChatMessage) => void;
  onTyping?: (payload: ChatTypingPayload) => void;
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceive);
    socket.on('typing', onTyping);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceive);
      socket.off('typing', onTyping);
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
