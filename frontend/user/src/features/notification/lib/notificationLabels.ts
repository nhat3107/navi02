import type { Location } from 'react-router-dom';
import type { NotificationRow } from '../types/notification.types';
import {
  buildPostPath,
  buildProfileAccountStatusPath,
  buildProfilePath,
} from '../../../shared/constants/routes';
import { isPenaltyNotice, isPostRemovalNotice } from './isPenaltyNotice';

export function summarizeNotificationType(row: NotificationRow): string {
  if (isPenaltyNotice(row)) {
    return row.preview?.trim() || 'Account restriction update';
  }
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
    case 'post_pending':
      return 'Your post is under review';
    case 'post_approved':
      return 'Your post is now visible';
    case 'post_deleted':
      return 'Your post was removed due to policy violations';
    case 'follow':
      return 'started following you';
    case 'share_post':
      return 'shared your post';
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
  if (isPenaltyNotice(row) || isPostRemovalNotice(row)) {
    return {
      to: buildProfileAccountStatusPath(),
      label: 'View account status',
    };
  }
  if (row.type === 'follow' || row.referenceType === 'user') {
    return { to: buildProfilePath(row.senderId), label: 'Profile' };
  }
  if (row.referenceType === 'post') {
    const label =
      row.type === 'post_pending' ? 'View post' : 'Open post';
    return { to: buildPostPath(row.referenceId), label };
  }
  return null;
}

/** Post detail opens as an overlay; profile and other targets use full navigation. */
export function notificationLinkState(
  row: NotificationRow,
  location: Location,
): { backgroundLocation: Location } | undefined {
  const act = notificationAction(row);
  if (!act) return undefined;
  if (act.to.startsWith('/post/')) {
    return { backgroundLocation: location };
  }
  return undefined;
}
