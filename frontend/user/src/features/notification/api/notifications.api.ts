import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type { NotificationRow } from '../types/notification.types';
import { normalizeNotificationRow } from '../lib/normalizeNotificationRow';

type ListEnvelope = {
  data?: Array<Record<string, unknown>>;
};

type CountEnvelope = {
  data?: { count?: number };
};

export async function fetchNotificationsListApi(params?: {
  limit?: number;
  skip?: number;
}): Promise<NotificationRow[]> {
  const res = await api.get<ListEnvelope>(API_ROUTES.NOTIFICATIONS, {
    params: params ?? {},
  });
  const rows = res.data?.data ?? [];
  return rows
    .map((r) => normalizeNotificationRow(r))
    .filter(Boolean) as NotificationRow[];
}

export async function fetchNotificationsUnreadApi(): Promise<number> {
  const res = await api.get<CountEnvelope>(
    `${API_ROUTES.NOTIFICATIONS}/unread-count`,
  );
  const n = res.data?.data?.count;
  return typeof n === 'number' ? n : 0;
}

export async function markNotificationReadApi(
  notificationId: string,
): Promise<void> {
  await api.patch(`${API_ROUTES.NOTIFICATIONS}/${notificationId}/read`);
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await api.patch(`${API_ROUTES.NOTIFICATIONS}/read-all`);
}

export async function deleteNotificationApi(
  notificationId: string,
): Promise<void> {
  await api.delete(`${API_ROUTES.NOTIFICATIONS}/${notificationId}`);
}
