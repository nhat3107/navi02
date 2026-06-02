import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  fetchNotificationsListApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../api/notifications.api';
import { useNotificationsStore } from '../store/notifications.store';
import { ROUTES } from '../../../shared/constants/routes';
import type { NotificationRow } from '../types/notification.types';
import { NotificationPanel } from './NotificationPanel';

function BellGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21h3.4c.3 0 .6-.2.7-.5l.4-1.2H9.2l.4 1.2c.1.3.4.5.7.5Z" />
    </svg>
  );
}

const PANEL_LIMIT = 20;

function bellTriggerClass(active: boolean) {
  return `app-top-nav__utility group relative h-10 w-10 motion-safe:hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
    active
      ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-300'
      : ''
  }`;
}

function BellBadge({ badge }: { badge: string | null }) {
  if (!badge) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums leading-none text-white shadow-sm ring-[3px] ring-white dark:ring-slate-950"
      aria-hidden
    >
      {badge}
    </span>
  );
}

function BellTriggerContent({ badge }: { badge: string | null }) {
  return (
    <>
      <BellGlyph className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
      <BellBadge badge={badge} />
    </>
  );
}

export function NotificationNavBell({ layout = 'default' }: { layout?: 'default' | 'sidebar' }) {
  const location = useLocation();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const patchRead = useNotificationsStore((s) => s.patchRead);
  const markAllReadLocal = useNotificationsStore((s) => s.markAllReadLocal);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const onNotificationsRoute = location.pathname.startsWith('/notifications');

  const ariaLabel =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : 'Notifications';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await fetchNotificationsListApi({ limit: PANEL_LIMIT });
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const badge =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  const handleMarkRead = async (row: NotificationRow) => {
    if (row.isRead) return;
    try {
      await markNotificationReadApi(row.id);
      patchRead(row.id, true);
      setItems((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, isRead: true } : item)),
      );
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      markAllReadLocal();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div
        className={`relative shrink-0${layout === 'sidebar' ? ' w-full' : ''}`}
        ref={wrapRef}
      >
        <Link
          to={ROUTES.NOTIFICATIONS}
          className={`${bellTriggerClass(onNotificationsRoute)} md:hidden`}
          aria-label={ariaLabel}
          aria-current={onNotificationsRoute ? 'page' : undefined}
        >
          <BellTriggerContent badge={badge} />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            layout === 'sidebar'
              ? `app-sidebar__link${onNotificationsRoute || open ? ' app-sidebar__link--active' : ''} hidden md:flex`
              : `${bellTriggerClass(onNotificationsRoute || open)} hidden md:flex`
          }
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          title="Notifications"
        >
          {layout === 'sidebar' ? (
            <>
              <span className="app-sidebar__icon relative">
                <BellGlyph className="h-[1.125rem] w-[1.125rem]" />
                <BellBadge badge={badge} />
              </span>
              <span className="app-sidebar__label">Notifications</span>
            </>
          ) : (
            <BellTriggerContent badge={badge} />
          )}
        </button>
      </div>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        loading={loading}
        unreadCount={unreadCount}
        onMarkRead={(row) => void handleMarkRead(row)}
        onMarkAllRead={() => void handleMarkAllRead()}
      />
    </>
  );
}
