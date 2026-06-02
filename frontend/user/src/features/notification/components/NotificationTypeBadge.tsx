import type { NotificationRow } from '../types/notification.types';
import { getNotificationVisual } from '../lib/notificationVisual';

export function NotificationTypeBadge({
  row,
  className = '',
}: {
  row: NotificationRow;
  className?: string;
}) {
  const visual = getNotificationVisual(row);
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${visual.badge} ${className}`.trim()}
    >
      {visual.label}
    </span>
  );
}
