import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { NotificationRow } from '../../features/notification/types/notification.types';
import {
  deleteNotificationApi,
  fetchNotificationsListApi,
  fetchNotificationsUnreadApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../../features/notification/api/notifications.api';
import { NotificationDismissButton } from '../../features/notification/components/NotificationDismissButton';
import { NotificationTypeBadge } from '../../features/notification/components/NotificationTypeBadge';
import { isAuthorSystemNotice } from '../../features/notification/lib/isAuthorSystemNotice';
import { notificationCardClasses } from '../../features/notification/lib/notificationVisual';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useNotificationsStore } from '../../features/notification/store/notifications.store';
import {
  notificationAction,
  notificationLinkState,
  summarizeNotificationType,
} from '../../features/notification/lib/notificationLabels';
import { useAuthorProfiles } from '../../features/network/hooks/useAuthorProfiles';
import { formatRelativeTime } from '../../features/network/lib/formatRelativeTime';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { AppPage } from '../../shared/layout/AppPage';
import { PageHeader } from '../../shared/components/PageHeader';
import { EmptyState } from '../../shared/components/EmptyState';
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
  const removeLocal = useNotificationsStore((s) => s.removeLocal);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setErr(null);
    try {
      await deleteNotificationApi(deleteTarget.id);
      removeLocal(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setErr('Could not remove that notification.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppPage mainClassName="max-w-[min(100%,640px)]">
        <PageHeader
          eyebrow="Activity"
          title="Notifications"
          description="Likes, comments, and updates from people you follow."
          badge={
            unreadCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-accent-bg px-2.5 py-1 text-[11px] font-semibold text-accent">
                {unreadCount} unread
              </span>
            ) : null
          }
          actions={
            <>
              <Link to={ROUTES.HOME} className="chip-btn">
                <ChevronLeftIcon className="mr-1.5 h-4 w-4" />
                Home
              </Link>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="chip-btn"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="chip-btn chip-btn--primary"
              >
                Mark all read
              </button>
            </>
          }
        />

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
          <EmptyState
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21h3.4c.3 0 .6-.2.7-.5l.4-1.2H9.2l.4 1.2c.1.3.4.5.7.5Z" />
              </svg>
            }
            title="You're all caught up"
            description="When something happens, it'll show up here and in the bell in the header."
          />
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
              const systemNotice = isAuthorSystemNotice(row);

              return (
                <li key={row.id}>
                  <div
                    className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors dark:shadow-none ${notificationCardClasses(row, row.isRead)}`}
                  >
                    <div className="flex gap-4">
                      <UserAvatar
                        label={systemNotice ? 'You' : name}
                        src={systemNotice ? null : avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-[15px] leading-snug text-neutral-900 dark:text-neutral-100">
                            {systemNotice ? (
                              act ? (
                                <Link
                                  to={act.to}
                                  state={notificationLinkState(row, location)}
                                  className="font-semibold text-accent hover:underline hover:text-accent-hover"
                                  onClick={() => void handleRowActivate(row)}
                                >
                                  {headline}
                                </Link>
                              ) : (
                                <span className="font-semibold">{headline}</span>
                              )
                            ) : (
                              <>
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
                              </>
                            )}
                          </p>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                            <NotificationTypeBadge row={row} />
                            {!row.isRead ? (
                              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                New
                              </span>
                            ) : null}
                            <NotificationDismissButton
                              onDismiss={() => setDeleteTarget(row)}
                            />
                          </div>
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
                              state={notificationLinkState(row, location)}
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
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete notification?"
        message="This will remove the notification from your list. You can't undo this."
        confirmLabel="Delete"
        confirming={deleting}
      />
    </AppPage>
  );
}
