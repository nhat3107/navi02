import type { NotificationRow } from '../types/notification.types';

export function normalizeNotificationRow(
  raw: Record<string, unknown>,
): NotificationRow | null {
  const idRaw = raw.id ?? raw._id;
  if (!idRaw) return null;
  const recipientId =
    typeof raw.recipientId === 'string' ? raw.recipientId : '';
  const senderId = typeof raw.senderId === 'string' ? raw.senderId : '';
  const referenceId =
    typeof raw.referenceId === 'string' ? raw.referenceId : '';
  const rt =
    typeof raw.referenceType === 'string' ? raw.referenceType : 'post';
  if (!recipientId || !senderId || !referenceId) return null;

  const createdRaw = raw.createdAt;
  const createdAt =
    createdRaw instanceof Date
      ? createdRaw.toISOString()
      : typeof createdRaw === 'string'
        ? createdRaw
        : undefined;

  return {
    id: String(idRaw),
    recipientId,
    senderId,
    type: typeof raw.type === 'string' ? raw.type : 'unknown',
    referenceId,
    referenceType:
      rt === 'comment' ||
      rt === 'user' ||
      rt === 'report' ||
      rt === 'post'
        ? rt
        : 'post',
    preview: typeof raw.preview === 'string' ? raw.preview : null,
    isRead: Boolean(raw.isRead),
    createdAt,
  };
}
