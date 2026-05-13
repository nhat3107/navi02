import type { NotificationRow } from '../types/notification.types';
import {
  buildPostPath,
  buildProfilePath,
} from '../../../shared/constants/routes';

export function summarizeNotificationType(row: NotificationRow): string {
  switch (row.type) {
    case 'like_post':
      return 'liked your post';
    case 'like_comment':
      return 'liked your comment';
    case 'comment':
      return 'commented on your post';
    case 'reply':
      return 'replied to your comment';
    case 'new_post':
      return 'shared a new post';
    case 'follow':
      return 'started following you';
    case 'report_reviewed':
      return 'report update';
    default:
      return row.type;
  }
}

export function notificationAction(row: NotificationRow): {
  to: string;
  label: string;
} | null {
  if (row.type === 'follow' || row.referenceType === 'user') {
    return { to: buildProfilePath(row.senderId), label: 'Profile' };
  }
  if (row.referenceType === 'post') {
    return { to: buildPostPath(row.referenceId), label: 'Open post' };
  }
  return null;
}
