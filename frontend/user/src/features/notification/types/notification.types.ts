export type NotificationReferenceType =
  | 'post'
  | 'comment'
  | 'user'
  | 'report';

export interface NotificationRow {
  id: string;
  recipientId: string;
  senderId: string;
  type: string;
  referenceId: string;
  referenceType: NotificationReferenceType;
  preview: string | null;
  isRead: boolean;
  /** ISO timestamp when present */
  createdAt?: string;
}
