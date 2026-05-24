export function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-hero dashboard-hero--skeleton">
        <div className="dash-skeleton dash-skeleton--title" />
        <div className="dash-skeleton dash-skeleton--text" />
      </div>
      <div className="dash-stat-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dash-stat dash-stat--skeleton">
            <div className="dash-skeleton dash-skeleton--icon" />
            <div className="dash-skeleton dash-skeleton--value" />
            <div className="dash-skeleton dash-skeleton--label" />
          </div>
        ))}
      </div>
      <div className="dashboard-panels">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-dashboard-cell">
            <div className="dash-dashboard-cell__body">
              <div className="dash-panel dash-panel--skeleton">
                <div className="dash-skeleton dash-skeleton--title" />
                {i === 1 ? (
                  Array.from({ length: 4 }).map((__, j) => (
                    <div key={j} className="dash-skeleton dash-skeleton--row" />
                  ))
                ) : (
                  <div className="dash-skeleton dash-skeleton--chart" />
                )}
              </div>
            </div>
            <div className="dash-dashboard-cell__footer">
              <span className="dash-dashboard-cell__spacer" aria-hidden />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
