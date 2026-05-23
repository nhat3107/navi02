import type { NotificationRow } from '../types/notification.types';

/** Penalty / restriction notice (reference is the user, not a post). */
export function isPenaltyNotice(row: NotificationRow): boolean {
  return (
    row.type === 'post_deleted' &&
    row.recipientId === row.senderId &&
    row.referenceType === 'user'
  );
}

/** Post removed by moderation — user should review account status. */
export function isPostRemovalNotice(row: NotificationRow): boolean {
  return (
    row.type === 'post_deleted' &&
    row.recipientId === row.senderId &&
    row.referenceType === 'post'
  );
}
