import type { PostsOverTimePoint } from '../../users/types/users.types';

interface PostsChartProps {
  data: PostsOverTimePoint[];
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function PostsChart({ data }: PostsChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const average = data.length > 0 ? Math.round(total / data.length) : 0;
  const peak = data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    data[0] ?? { date: '', count: 0 },
  );

  return (
    <section className="dash-panel dash-panel--chart">
      <div className="dash-panel__header">
        <div>
          <h2 className="dash-panel__title">Posts activity</h2>
          <p className="dash-panel__subtitle">New posts over the last 7 days</p>
        </div>
        <div className="dash-chart-summary">
          <div className="dash-chart-summary__item">
            <span className="dash-chart-summary__value">{total}</span>
            <span className="dash-chart-summary__label">Total</span>
          </div>
          <div className="dash-chart-summary__item">
            <span className="dash-chart-summary__value">{average}</span>
            <span className="dash-chart-summary__label">Daily avg</span>
          </div>
          <div className="dash-chart-summary__item">
            <span className="dash-chart-summary__value">{peak.count}</span>
            <span className="dash-chart-summary__label">Peak day</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="page-muted dash-panel__empty">No post data yet.</p>
      ) : (
        <div
          className="dash-chart"
          role="img"
          aria-label="Posts created per day for the last week"
        >
          {data.map((point) => {
            const height = Math.round((point.count / max) * 100);
            const shortDate = point.date.slice(5);
            return (
              <div key={point.date} className="dash-chart__col">
                <span className="dash-chart__count">{point.count}</span>
                <div className="dash-chart__track">
                  <div
                    className="dash-chart__bar"
                    style={{ height: `${Math.max(height, point.count > 0 ? 8 : 2)}%` }}
                    title={`${point.count} posts on ${point.date}`}
                  />
                </div>
                <span className="dash-chart__day">{formatDayLabel(point.date)}</span>
                <span className="dash-chart__date">{shortDate}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
