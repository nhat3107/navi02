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
        <div className="dash-panel dash-panel--skeleton">
          <div className="dash-skeleton dash-skeleton--title" />
          <div className="dash-skeleton dash-skeleton--chart" />
        </div>
        <div className="dash-panel dash-panel--skeleton">
          <div className="dash-skeleton dash-skeleton--title" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dash-skeleton dash-skeleton--row" />
          ))}
        </div>
      </div>
    </div>
  );
}
