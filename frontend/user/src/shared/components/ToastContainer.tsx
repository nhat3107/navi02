import { useMemo } from 'react';
import { useToastStore, type ToastSurface } from '../store/toast.store';

const TONE_STYLES = {
  error:
    'border-red-200/90 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-100',
  success:
    'border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-100',
  info: 'border-neutral-200/90 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
} as const;

interface ToastContainerProps {
  surface?: ToastSurface;
}

export function ToastContainer({ surface = 'global' }: ToastContainerProps) {
  const allToasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);
  const toasts = useMemo(
    () => allToasts.filter((t) => t.surface === surface),
    [allToasts, surface],
  );

  if (toasts.length === 0) return null;

  const isLogin = surface === 'login';

  return (
    <div
      className={
        isLogin
          ? 'flex w-full flex-col gap-2'
          : 'pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6'
      }
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="alert"
          className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:shadow-black/40 ${TONE_STYLES[item.tone]} ${isLogin ? '' : 'max-w-md'}`}
        >
          {item.tone === 'error' ? (
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
            </span>
          ) : null}
          <p className="min-w-0 flex-1 pt-1 text-sm font-medium leading-snug">
            {item.message}
          </p>
          <button
            type="button"
            onClick={() => dismissToast(item.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
