import type { PostsOverTimePoint } from '../../users/types/users.types';

type DashBarChartProps = {
  title: string;
  subtitle: string;
  emptyLabel: string;
  ariaLabel: string;
  data: PostsOverTimePoint[];
  variant: 'posts' | 'reports' | 'users';
};

const CHART_TRACK_HEIGHT_PX = 100;

function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function DashBarChart({
  title,
  subtitle,
  emptyLabel,
  ariaLabel,
  data,
  variant,
}: DashBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const average = data.length > 0 ? Math.round(total / data.length) : 0;
  const peak = data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    data[0] ?? { date: '', count: 0 },
  );

  return (
    <section className={`dash-panel dash-panel--chart dash-panel--chart-${variant}`}>
      <div className="dash-panel__header">
        <div>
          <h2 className="dash-panel__title">{title}</h2>
          <p className="dash-panel__subtitle">{subtitle}</p>
        </div>
        <div className="dash-panel__header-end">
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
      </div>

      {data.length === 0 ? (
        <p className="page-muted dash-panel__empty">{emptyLabel}</p>
      ) : (
        <div className="dash-chart" role="img" aria-label={ariaLabel}>
          {data.map((point) => {
            const barHeight =
              point.count > 0
                ? Math.max(10, Math.round((point.count / max) * CHART_TRACK_HEIGHT_PX))
                : 4;
            const shortDate = point.date.slice(5);
            const unit =
              variant === 'reports'
                ? 'reports'
                : variant === 'users'
                  ? 'signups'
                  : 'posts';
            return (
              <div key={point.date} className="dash-chart__col">
                <span className="dash-chart__count">{point.count}</span>
                <div
                  className={`dash-chart__track dash-chart__track--${variant}`}
                  style={{ height: `${CHART_TRACK_HEIGHT_PX}px` }}
                >
                  <div
                    className={`dash-chart__bar dash-chart__bar--${variant}`}
                    style={{ height: `${barHeight}px` }}
                    title={`${point.count} ${unit} on ${point.date}`}
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
