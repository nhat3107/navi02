import { create } from 'zustand';
import type { NotificationRow } from '../types/notification.types';

type NotificationsState = {
  items: NotificationRow[];
  unreadCount: number;
  setFromList: (rows: NotificationRow[]) => void;
  setUnreadFromApi: (count: number) => void;
  pushRealtimeRow: (row: NotificationRow) => void;
  patchRead: (id: string, isRead: boolean) => void;
  markAllReadLocal: () => void;
  removeLocal: (id: string) => void;
  clear: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unreadCount: 0,

  setFromList: (rows) => set({ items: rows }),

  setUnreadFromApi: (count) => set({ unreadCount: Math.max(0, count) }),

  pushRealtimeRow: (row) =>
    set((s) => {
      if (s.items.some((i) => i.id === row.id)) return s;
      return {
        items: [row, ...s.items],
        unreadCount: s.unreadCount + (row.isRead ? 0 : 1),
      };
    }),

  patchRead: (id, isRead) =>
    set((s) => {
      let delta = 0;
      const items = s.items.map((row) => {
        if (row.id !== id) return row;
        if (row.isRead === isRead) return row;
        if (!row.isRead && isRead) delta -= 1;
        return { ...row, isRead };
      });
      return { items, unreadCount: Math.max(0, s.unreadCount + delta) };
    }),

  markAllReadLocal: () =>
    set((s) => ({
      items: s.items.map((row) =>
        row.isRead ? row : { ...row, isRead: true },
      ),
      unreadCount: 0,
    })),

  removeLocal: (id) =>
    set((s) => {
      const row = s.items.find((i) => i.id === id);
      if (!row) return s;
      return {
        items: s.items.filter((i) => i.id !== id),
        unreadCount:
          row.isRead ? s.unreadCount : Math.max(0, s.unreadCount - 1),
      };
    }),

  clear: () =>
    set({
      items: [],
      unreadCount: 0,
    }),
}));
