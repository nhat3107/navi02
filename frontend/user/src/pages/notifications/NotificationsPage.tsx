import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { NotificationRow } from '../../features/notification/types/notification.types';
import {
  fetchNotificationsListApi,
  fetchNotificationsUnreadApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../../features/notification/api/notifications.api';
import { useNotificationsStore } from '../../features/notification/store/notifications.store';
import {
  notificationAction,
  summarizeNotificationType,
} from '../../features/notification/lib/notificationLabels';
import { useAuthorProfiles } from '../../features/network/hooks/useAuthorProfiles';
import { formatRelativeTime } from '../../features/network/lib/formatRelativeTime';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { ROUTES } from '../../shared/constants/routes';

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      />
    </svg>
  );
}

export function NotificationsPage() {
  const location = useLocation();
  const storeItems = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const setFromList = useNotificationsStore((s) => s.setFromList);
  const setUnreadFromApi = useNotificationsStore((s) => s.setUnreadFromApi);
  const markAllReadLocal = useNotificationsStore((s) => s.markAllReadLocal);
  const patchRead = useNotificationsStore((s) => s.patchRead);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [list, unread] = await Promise.all([
        fetchNotificationsListApi({ limit: 50 }),
        fetchNotificationsUnreadApi(),
      ]);
      setFromList(list);
      setUnreadFromApi(unread);
    } catch {
      setErr('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [setFromList, setUnreadFromApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const senderIds = useMemo(
    () => [...new Set(storeItems.map((i) => i.senderId).filter(Boolean))],
    [storeItems],
  );
  const { byId: profiles } = useAuthorProfiles(senderIds);

  const handleRowActivate = async (row: NotificationRow) => {
    if (row.isRead) return;
    try {
      await markNotificationReadApi(row.id);
      patchRead(row.id, true);
    } catch {
      /* ignore single-row failure */
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsReadApi();
      markAllReadLocal();
    } catch {
      setErr('Could not mark all as read.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-black">
      <AppNavBar />

      <main className="mx-auto w-full max-w-[min(100%,640px)] px-3 pb-12 pt-4 sm:px-4 sm:pt-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              to={ROUTES.HOME}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-200/70 bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm backdrop-blur transition hover:border-neutral-300 hover:bg-white hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/85 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
              <ChevronLeftIcon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
              Back to home
            </Link>
            <div className="flex flex-wrap items-end gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
                Notifications
              </h1>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {unreadCount} unread
                </span>
              ) : null}
            </div>
            <p className="mt-2 max-w-lg text-sm text-neutral-600 dark:text-neutral-400">
              Likes, comments, and updates from people you follow.
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:border-neutral-700"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover dark:shadow-none"
          >
            Mark all read
          </button>
        </div>

        {err ? (
          <p className="mb-4 rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/80 dark:bg-red-950/50 dark:text-red-200">
            {err}
          </p>
        ) : null}

        {loading && storeItems.length === 0 ? (
          <ul className="flex flex-col gap-3 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none"
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-2/3 max-w-xs animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                </div>
              </li>
            ))}
          </ul>
        ) : storeItems.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21h3.4c.3 0 .6-.2.7-.5l.4-1.2H9.2l.4 1.2c.1.3.4.5.7.5Z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              You&apos;re all caught up
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              When something happens, it&apos;ll show up here and in the bell in
              the header.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {storeItems.map((row) => {
              const prof = profiles[row.senderId];
              const name =
                prof?.full_name?.trim() ||
                (prof?.username ? `@${prof.username}` : null) ||
                row.senderId.slice(0, 8);
              const when = row.createdAt
                ? formatRelativeTime(row.createdAt)
                : '';
              const preview = row.preview?.trim();
              const act = notificationAction(row);
              const headline = summarizeNotificationType(row);
              const avatarUrl = prof?.avatar_url ?? null;

              return (
                <li key={row.id}>
                  <div
                    className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors dark:shadow-none ${
                      row.isRead
                        ? 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950'
                        : 'border-neutral-200 bg-accent-bg ring-1 ring-neutral-200/90 dark:border-neutral-800 dark:bg-accent-bg dark:ring-neutral-800'
                    }`}
                  >
                    <div className="flex gap-4">
                      <UserAvatar label={name} src={avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-[15px] leading-snug text-neutral-900 dark:text-neutral-100">
                            <button
                              type="button"
                              className="text-left font-semibold text-accent hover:underline hover:text-accent-hover"
                              onClick={() => void handleRowActivate(row)}
                            >
                              {name}
                            </button>{' '}
                            <span className="font-normal text-neutral-600 dark:text-neutral-400">
                              {headline}
                            </span>
                          </p>
                          {!row.isRead ? (
                            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          ) : null}
                        </div>
                        {preview ? (
                          <p className="mt-2 line-clamp-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                            {preview}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {when ? (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {when}
                            </span>
                          ) : null}
                          {act ? (
                            <Link
                              to={act.to}
                              state={{
                                backgroundLocation: location,
                              }}
                              className="text-xs font-bold text-accent hover:text-accent-hover"
                              onClick={() => void handleRowActivate(row)}
                            >
                              {act.label} →
                            </Link>
                          ) : row.referenceType === 'comment' ? (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              Open the post from your feed to see the thread.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
