import { Link } from 'react-router-dom';
import type { DashboardActivity } from '../../users/types/users.types';
import { ROUTES } from '../../../shared/constants/routes';
import { formatRelativeTime } from '../../../shared/utils/format';

export const DASHBOARD_RECENT_ACTIVITY_LIMIT = 4;

interface ActivityTimelineProps {
  items: DashboardActivity[];
  limit?: number;
}

function activityLink(item: DashboardActivity): string | null {
  if (item.type === 'report') return ROUTES.REPORTS;
  if (item.type === 'post') return ROUTES.POSTS_PENDING;
  return null;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === 'report') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function ActivityTimeline({
  items,
  limit = DASHBOARD_RECENT_ACTIVITY_LIMIT,
}: ActivityTimelineProps) {
  const visible = items.slice(0, limit);

  return (
    <section className="dash-panel dash-panel--timeline">
      <div className="dash-panel__header">
        <div>
          <h2 className="dash-panel__title">Recent activity</h2>
          <p className="dash-panel__subtitle">
            Latest posts and reports · showing {limit}
          </p>
        </div>
        <Link to={ROUTES.REPORTS} className="dash-panel__link">
          View reports
        </Link>
      </div>

      {visible.length === 0 ? (
        <p className="page-muted dash-panel__empty">No recent activity.</p>
      ) : (
        <ul className="dash-activity">
          {visible.map((item) => {
            const href = activityLink(item);
            const content = (
              <>
                <span
                  className={`dash-activity__icon dash-activity__icon--${item.type}`}
                >
                  <ActivityIcon type={item.type} />
                </span>
                <div className="dash-activity__body">
                  <p>{item.message}</p>
                  <span className="dash-activity__time">
                    {formatRelativeTime(item.at)}
                  </span>
                </div>
              </>
            );

            return (
              <li key={`${item.type}-${item.refId}-${item.at}`}>
                {href ? (
                  <Link to={href} className="dash-activity__item dash-activity__item--link">
                    {content}
                  </Link>
                ) : (
                  <div className="dash-activity__item">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
