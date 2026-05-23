import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  fetchNotificationsListApi,
  markNotificationReadApi,
} from '../api/notifications.api';
import { isAuthorSystemNotice } from '../lib/isAuthorSystemNotice';
import {
  notificationRowClasses,
  notificationUnreadDotClass,
} from '../lib/notificationVisual';
import { useNotificationsStore } from '../store/notifications.store';
import { useAuthorProfiles } from '../../network/hooks/useAuthorProfiles';
import { formatRelativeTime } from '../../network/lib/formatRelativeTime';
import { ROUTES } from '../../../shared/constants/routes';
import { UserAvatar } from '../../user/components/UserAvatar';
import type { NotificationRow } from '../types/notification.types';
import {
  notificationAction,
  notificationLinkState,
  summarizeNotificationType,
} from '../lib/notificationLabels';
import { NotificationTypeBadge } from './NotificationTypeBadge';

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

const PEEK_LIMIT = 7;

export function NotificationNavBell() {
  const location = useLocation();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const patchRead = useNotificationsStore((s) => s.patchRead);

  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState<NotificationRow[]>([]);
  const [peekLoading, setPeekLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const onNotificationsRoute = location.pathname.startsWith('/notifications');

  useEffect(() => {
    function onPointerDown(ev: MouseEvent | TouchEvent) {
      const el = wrapRef.current;
      if (!el || !(ev.target instanceof Node)) return;
      if (!el.contains(ev.target)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('touchstart', onPointerDown);
    }
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setPeekLoading(true);
      try {
        const list = await fetchNotificationsListApi({ limit: PEEK_LIMIT });
        if (!cancelled) setPeek(list);
      } catch {
        if (!cancelled) setPeek([]);
      } finally {
        if (!cancelled) setPeekLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const senderIds = useMemo(
    () => [...new Set(peek.map((p) => p.senderId).filter(Boolean))],
    [peek],
  );
  const { byId: profiles } = useAuthorProfiles(senderIds);

  const badge =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-safe:hover:-translate-y-px ${
          onNotificationsRoute || open
            ? 'border-neutral-300 bg-accent-bg text-accent shadow-sm dark:border-neutral-600 dark:bg-accent-bg dark:text-accent'
            : 'border-neutral-200/80 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-white hover:text-accent hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-accent'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <BellGlyph className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
        {badge ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums leading-none text-white shadow-sm ring-[3px] ring-white dark:ring-neutral-950"
            aria-hidden
          >
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-2rem),20.5rem)] origin-top-right"
          role="menu"
          aria-label="Recent notifications"
        >
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <p className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Notifications
              </p>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] font-semibold text-accent dark:bg-accent-bg">
                  {unreadCount} new
                </span>
              ) : null}
            </div>

            <div className="max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain">
              {peekLoading ? (
                <ul className="divide-y divide-neutral-100 p-2 dark:divide-neutral-800">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl px-2 py-2.5"
                    >
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                        <div className="h-3 w-full max-w-[12rem] animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : peek.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                    <BellGlyph className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    You&apos;re all caught up
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                    New activity will appear here
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {peek.map((row) => {
                    const prof = profiles[row.senderId];
                    const name =
                      prof?.full_name?.trim() ||
                      (prof?.username ? `@${prof.username}` : null) ||
                      row.senderId.slice(0, 8);
                    const when = row.createdAt
                      ? formatRelativeTime(row.createdAt)
                      : '';
                    const act = notificationAction(row);
                    const primary = summarizeNotificationType(row);
                    const systemNotice = isAuthorSystemNotice(row);

                    return (
                      <li key={row.id}>
                        <div
                          className={`flex gap-3 px-3 py-2.5 transition-colors ${notificationRowClasses(row, row.isRead)}`}
                        >
                          <div className="relative shrink-0">
                            <UserAvatar
                              label={systemNotice ? 'You' : name}
                              src={systemNotice ? null : prof?.avatar_url ?? null}
                              size="sm"
                            />
                            {!row.isRead ? (
                              <span
                                className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full shadow ring-2 ring-white dark:ring-neutral-950 ${notificationUnreadDotClass(row)}`}
                                aria-hidden
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1">
                              <NotificationTypeBadge row={row} />
                            </div>
                            <p className="text-[13px] leading-snug text-neutral-800 dark:text-neutral-200">
                              {systemNotice ? (
                                act ? (
                                  <Link
                                    to={act.to}
                                    state={notificationLinkState(row, location)}
                                    className="font-semibold text-accent hover:text-accent-hover"
                                    onClick={async () => {
                                      setOpen(false);
                                      if (!row.isRead) {
                                        try {
                                          await markNotificationReadApi(row.id);
                                          patchRead(row.id, true);
                                        } catch {
                                          /* ignore */
                                        }
                                      }
                                    }}
                                  >
                                    {primary}
                                  </Link>
                                ) : (
                                  <span className="font-semibold">{primary}</span>
                                )
                              ) : (
                                <>
                                  <span className="font-semibold">{name}</span>{' '}
                                  <span className="font-normal text-neutral-600 dark:text-neutral-400">
                                    {primary}
                                  </span>
                                </>
                              )}
                              {row.preview?.trim() ? (
                                <span className="block truncate text-neutral-500 dark:text-neutral-500">
                                  “{row.preview.trim().slice(0, 72)}
                                  {row.preview.length > 72 ? '…' : ''}”
                                </span>
                              ) : null}
                            </p>
                            {when ? (
                              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-500">
                                {when}
                              </p>
                            ) : null}
                            {act ? (
                              <Link
                                to={act.to}
                                state={notificationLinkState(row, location)}
                                role="menuitem"
                                className="mt-1.5 inline-flex text-xs font-semibold text-accent hover:text-accent-hover"
                                onClick={async () => {
                                  setOpen(false);
                                  if (!row.isRead) {
                                    try {
                                      await markNotificationReadApi(row.id);
                                      patchRead(row.id, true);
                                    } catch {
                                      /* ignore */
                                    }
                                  }
                                }}
                              >
                                {act.label}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-neutral-100 bg-neutral-50/90 p-2 dark:border-neutral-800 dark:bg-neutral-950/80">
              <NavLink
                to={ROUTES.NOTIFICATIONS}
                role="menuitem"
                className="flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-accent shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-accent-hover dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                onClick={() => setOpen(false)}
              >
                View all activity
              </NavLink>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
