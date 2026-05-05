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
