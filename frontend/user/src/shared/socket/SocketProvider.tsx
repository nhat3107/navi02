import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { normalizeNotificationRow } from '../../features/notification/lib/normalizeNotificationRow';
import { useNotificationsStore } from '../../features/notification/store/notifications.store';
import { wsOriginFromEnv } from './ws-origin';

const SocketContext = createContext<Socket | null>(null);

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      return;
    }

    const origin = wsOriginFromEnv();
    const s = io(`${origin}/chat`, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [accessToken]);

  const value = useMemo(() => socket, [socket]);
  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): Socket | null {
  return useContext(SocketContext);
}

/** Connects Socket.IO `/notifications`; merges payloads into notifications store. */
export function NotificationSocketProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      useNotificationsStore.getState().clear();
      return;
    }

    const origin = wsOriginFromEnv();
    const s = io(`${origin}/notifications`, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    const onNew = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const row = normalizeNotificationRow(payload as Record<string, unknown>);
      if (row) useNotificationsStore.getState().pushRealtimeRow(row);
    };

    s.on('notification:new', onNew);
    return () => {
      s.off('notification:new', onNew);
      s.disconnect();
    };
  }, [accessToken]);

  return <>{children}</>;
}
