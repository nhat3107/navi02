import { create } from 'zustand';

export type ToastTone = 'error' | 'success' | 'info';
export type ToastSurface = 'global' | 'login';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  surface: ToastSurface;
}

interface ToastState {
  toasts: ToastItem[];
  pushToast: (
    message: string,
    tone?: ToastTone,
    durationMs?: number,
    surface?: ToastSurface,
  ) => void;
  dismissToast: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pushToast(message, tone = 'info', durationMs = 5000, surface = 'global') {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, tone, surface }] });
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      }, durationMs),
    );
  },
  dismissToast(id) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function toast(
  message: string,
  tone: ToastTone = 'info',
  durationMs?: number,
  surface: ToastSurface = 'global',
) {
  useToastStore.getState().pushToast(message, tone, durationMs, surface);
}

export function loginToast(
  message: string,
  tone: ToastTone = 'error',
  durationMs = 6000,
) {
  useToastStore.getState().pushToast(message, tone, durationMs, 'login');
}
