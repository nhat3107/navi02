import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { formatRelativeTime } from '../../network/lib/formatRelativeTime';
import { useAuthorProfiles } from '../../network/hooks/useAuthorProfiles';
import { UserAvatar } from '../../user/components/UserAvatar';
import { ROUTES } from '../../../shared/constants/routes';
import { isAuthorSystemNotice } from '../lib/isAuthorSystemNotice';
import {
  notificationRowClasses,
  notificationUnreadDotClass,
} from '../lib/notificationVisual';
import {
  notificationAction,
  notificationLinkState,
  summarizeNotificationType,
} from '../lib/notificationLabels';
import type { NotificationRow } from '../types/notification.types';

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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  items: NotificationRow[];
  loading: boolean;
  unreadCount: number;
  onMarkRead: (row: NotificationRow) => void;
  onMarkAllRead: () => void;
}

export function NotificationPanel({
  open,
  onClose,
  items,
  loading,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const location = useLocation();
  const senderIds = [...new Set(items.map((p) => p.senderId).filter(Boolean))];
  const { byId: profiles } = useAuthorProfiles(senderIds);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="notification-panel-root" role="presentation">
      <button
        type="button"
        className="notification-panel-backdrop"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <aside
        className="notification-panel"
        role="dialog"
        aria-modal
        aria-label="Notifications"
      >
        <header className="notification-panel__header">
          <div className="min-w-0">
            <h2 className="notification-panel__title">Notifications</h2>
            {unreadCount > 0 ? (
              <p className="notification-panel__subtitle">{unreadCount} unread</p>
            ) : (
              <p className="notification-panel__subtitle">You're all caught up</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="notification-panel__mark-all"
              >
                Mark all read
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="notification-panel__close"
              aria-label="Close"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="notification-panel__body">
          {loading ? (
            <ul className="notification-panel__list">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="notification-panel__skeleton" aria-hidden />
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="notification-panel__empty">
              <div className="notification-panel__empty-icon">
                <BellGlyph className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Likes, comments, and follows will show up here.
              </p>
            </div>
          ) : (
            <ul className="notification-panel__list">
              {items.map((row) => {
                const prof = profiles[row.senderId];
                const name =
                  prof?.full_name?.trim() ||
                  (prof?.username ? `@${prof.username}` : null) ||
                  row.senderId.slice(0, 8);
                const when = row.createdAt ? formatRelativeTime(row.createdAt) : '';
                const act = notificationAction(row);
                const primary = summarizeNotificationType(row);
                const systemNotice = isAuthorSystemNotice(row);
                const rowClass = notificationRowClasses(row, row.isRead);

                const handleActivate = () => {
                  onMarkRead(row);
                  onClose();
                };

                const content = (
                  <>
                    <div className="relative shrink-0">
                      <UserAvatar
                        label={systemNotice ? 'You' : name}
                        src={systemNotice ? null : prof?.avatar_url ?? null}
                        size="sm"
                      />
                      {!row.isRead ? (
                        <span
                          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-950 ${notificationUnreadDotClass(row)}`}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-slate-800 dark:text-slate-100">
                        {systemNotice ? (
                          <span className="font-semibold">{primary}</span>
                        ) : (
                          <>
                            <span className="font-semibold">{name}</span>{' '}
                            <span className="font-normal text-slate-600 dark:text-slate-400">
                              {primary}
                            </span>
                          </>
                        )}
                      </p>
                      {row.preview?.trim() ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {row.preview.trim()}
                        </p>
                      ) : null}
                      {when ? (
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {when}
                        </p>
                      ) : null}
                    </div>
                  </>
                );

                return (
                  <li key={row.id}>
                    {act ? (
                      <Link
                        to={act.to}
                        state={notificationLinkState(row, location)}
                        className={`notification-panel__row ${rowClass}`}
                        onClick={handleActivate}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`notification-panel__row ${rowClass}`}
                        onClick={() => {
                          onMarkRead(row);
                        }}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="notification-panel__footer">
          <NavLink
            to={ROUTES.NOTIFICATIONS}
            className="notification-panel__view-all"
            onClick={onClose}
          >
            View all notifications
          </NavLink>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
