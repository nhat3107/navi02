import type { NotificationRow } from '../types/notification.types';

/** Moderation notices where senderId is the recipient (no external actor). */
export function isAuthorSystemNotice(row: NotificationRow): boolean {
  return (
    row.recipientId === row.senderId &&
    (row.type === 'post_pending' ||
      row.type === 'post_approved' ||
      row.type === 'post_deleted')
  );
}
