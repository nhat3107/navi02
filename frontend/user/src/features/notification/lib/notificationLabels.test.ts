import { describe, expect, it } from 'vitest';
import type { NotificationRow } from '../types/notification.types';
import { summarizeNotificationType } from './notificationLabels';
import { isAuthorSystemNotice } from './isAuthorSystemNotice';

function row(partial: Partial<NotificationRow>): NotificationRow {
  return {
    id: 'n1',
    recipientId: 'u1',
    senderId: 'u2',
    type: 'like_post',
    referenceType: 'post',
    referenceId: 'p1',
    isRead: false,
    preview: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('summarizeNotificationType', () => {
  it('maps known notification types', () => {
    expect(summarizeNotificationType(row({ type: 'like_post' }))).toBe(
      'liked your post',
    );
    expect(summarizeNotificationType(row({ type: 'reply' }))).toBe(
      'replied to your comment',
    );
    expect(summarizeNotificationType(row({ type: 'post_pending' }))).toBe(
      'Your post is under review',
    );
  });

  it('uses preview for penalty notices', () => {
    expect(
      summarizeNotificationType(
        row({
          type: 'post_deleted',
          recipientId: 'u1',
          senderId: 'u1',
          referenceType: 'user',
          preview: 'Temporary restriction',
        }),
      ),
    ).toBe('Temporary restriction');
  });
});

describe('isAuthorSystemNotice', () => {
  it('detects moderation notices from self', () => {
    expect(
      isAuthorSystemNotice(
        row({
          recipientId: 'u1',
          senderId: 'u1',
          type: 'post_approved',
        }),
      ),
    ).toBe(true);
    expect(
      isAuthorSystemNotice(
        row({ recipientId: 'u1', senderId: 'u2', type: 'post_approved' }),
      ),
    ).toBe(false);
  });
});
