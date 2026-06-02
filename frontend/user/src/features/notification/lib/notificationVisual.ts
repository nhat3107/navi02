import type { NotificationRow } from '../types/notification.types';
import { isPenaltyNotice, isPostRemovalNotice } from './isPenaltyNotice';

export type NotificationVisualKind =
  | 'like'
  | 'comment'
  | 'follow'
  | 'new_post'
  | 'moderation_pending'
  | 'moderation_approved'
  | 'moderation_removed'
  | 'penalty'
  | 'report'
  | 'default';

type NotificationVisualStyle = {
  label: string;
  badge: string;
  cardUnread: string;
  cardRead: string;
  rowUnread: string;
  rowRead: string;
  dot: string;
};

const STYLES: Record<NotificationVisualKind, NotificationVisualStyle> = {
  like: {
    label: 'Like',
    badge:
      'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200',
    cardUnread:
      'border-rose-200/90 bg-rose-50/70 ring-rose-200/60 dark:border-rose-900/50 dark:bg-rose-950/35 dark:ring-rose-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-rose-50/80 dark:bg-rose-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-rose-500',
  },
  comment: {
    label: 'Comment',
    badge:
      'bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-200',
    cardUnread:
      'border-sky-200/90 bg-sky-50/70 ring-sky-200/60 dark:border-sky-900/50 dark:bg-sky-950/35 dark:ring-sky-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-sky-50/80 dark:bg-sky-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-sky-500',
  },
  follow: {
    label: 'Follow',
    badge:
      'bg-violet-100 text-violet-900 dark:bg-violet-950/70 dark:text-violet-200',
    cardUnread:
      'border-violet-200/90 bg-violet-50/70 ring-violet-200/60 dark:border-violet-900/50 dark:bg-violet-950/35 dark:ring-violet-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-violet-50/80 dark:bg-violet-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-violet-500',
  },
  new_post: {
    label: 'New post',
    badge:
      'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200',
    cardUnread:
      'border-indigo-200/90 bg-indigo-50/70 ring-indigo-200/60 dark:border-indigo-900/50 dark:bg-indigo-950/35 dark:ring-indigo-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-indigo-500',
  },
  moderation_pending: {
    label: 'Under review',
    badge:
      'bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-200',
    cardUnread:
      'border-amber-200/90 bg-amber-50/70 ring-amber-200/60 dark:border-amber-900/50 dark:bg-amber-950/35 dark:ring-amber-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-amber-50/80 dark:bg-amber-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-amber-500',
  },
  moderation_approved: {
    label: 'Approved',
    badge:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200',
    cardUnread:
      'border-emerald-200/90 bg-emerald-50/70 ring-emerald-200/60 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:ring-emerald-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-emerald-500',
  },
  moderation_removed: {
    label: 'Removed',
    badge:
      'bg-orange-100 text-orange-950 dark:bg-orange-950/70 dark:text-orange-200',
    cardUnread:
      'border-orange-200/90 bg-orange-50/70 ring-orange-200/60 dark:border-orange-900/50 dark:bg-orange-950/35 dark:ring-orange-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-orange-50/80 dark:bg-orange-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-orange-500',
  },
  penalty: {
    label: 'Penalty',
    badge: 'bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-200',
    cardUnread:
      'border-red-200/90 bg-red-50/70 ring-red-200/60 dark:border-red-900/50 dark:bg-red-950/35 dark:ring-red-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-red-50/80 dark:bg-red-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-red-500',
  },
  report: {
    label: 'Report',
    badge:
      'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/70 dark:text-fuchsia-200',
    cardUnread:
      'border-fuchsia-200/90 bg-fuchsia-50/70 ring-fuchsia-200/60 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/35 dark:ring-fuchsia-900/40',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/30',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-fuchsia-500',
  },
  default: {
    label: 'Update',
    badge:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    cardUnread:
      'border-slate-200 bg-accent-bg ring-slate-200/90 dark:border-slate-800 dark:bg-accent-bg dark:ring-slate-800',
    cardRead:
      'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    rowUnread: 'bg-accent-bg dark:bg-accent-bg',
    rowRead: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    dot: 'bg-slate-400',
  },
};

const ACCENT_BORDER: Record<NotificationVisualKind, string> = {
  like: 'border-l-rose-500',
  comment: 'border-l-sky-500',
  follow: 'border-l-violet-500',
  new_post: 'border-l-indigo-500',
  moderation_pending: 'border-l-amber-500',
  moderation_approved: 'border-l-emerald-500',
  moderation_removed: 'border-l-orange-500',
  penalty: 'border-l-red-500',
  report: 'border-l-fuchsia-500',
  default: 'border-l-slate-400',
};

export function notificationVisualKind(
  row: NotificationRow,
): NotificationVisualKind {
  if (isPenaltyNotice(row)) return 'penalty';
  if (isPostRemovalNotice(row)) return 'moderation_removed';
  switch (row.type) {
    case 'like_post':
    case 'like_comment':
      return 'like';
    case 'comment':
    case 'reply':
      return 'comment';
    case 'follow':
      return 'follow';
    case 'new_post':
      return 'new_post';
    case 'post_pending':
      return 'moderation_pending';
    case 'post_approved':
      return 'moderation_approved';
    case 'post_deleted':
      return 'moderation_removed';
    case 'report_reviewed':
      return 'report';
    default:
      return 'default';
  }
}

export function getNotificationVisual(row: NotificationRow) {
  const kind = notificationVisualKind(row);
  return { kind, ...STYLES[kind] };
}

export function notificationCardClasses(
  row: NotificationRow,
  isRead: boolean,
): string {
  const visual = getNotificationVisual(row);
  const base = isRead ? visual.cardRead : visual.cardUnread;
  const accent = ACCENT_BORDER[visual.kind];
  const ring = isRead ? '' : 'ring-1';
  return `border-l-4 ${accent} ${base} ${ring}`.trim();
}

export function notificationRowClasses(
  row: NotificationRow,
  isRead: boolean,
): string {
  const visual = getNotificationVisual(row);
  return isRead ? visual.rowRead : visual.rowUnread;
}

export function notificationUnreadDotClass(row: NotificationRow): string {
  return getNotificationVisual(row).dot;
}
