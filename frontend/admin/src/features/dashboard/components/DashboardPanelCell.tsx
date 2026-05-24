import type { ReactNode } from 'react';

export function DashboardPanelCell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="dash-dashboard-cell">
      <div className="dash-dashboard-cell__body">{children}</div>
      <div className="dash-dashboard-cell__footer">
        {footer ?? <span className="dash-dashboard-cell__spacer" aria-hidden />}
      </div>
    </div>
  );
}
