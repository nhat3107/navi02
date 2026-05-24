import { Link } from 'react-router-dom';
import type { ReportsOverTimePoint } from '../../users/types/users.types';
import { ROUTES } from '../../../shared/constants/routes';
import { DashBarChart } from './DashBarChart';

interface ReportsChartProps {
  data: ReportsOverTimePoint[];
}

export function ReportsChart({ data }: ReportsChartProps) {
  return (
    <DashBarChart
      variant="reports"
      title="Reports activity"
      subtitle="New reports filed over the last 7 days"
      emptyLabel="No reports filed this week."
      ariaLabel="Reports filed per day for the last week"
      data={data}
    />
  );
}

export function ReportsChartFooterLink() {
  return (
    <Link to={ROUTES.REPORTS} className="dash-dashboard-cell__link">
      Open reports queue →
    </Link>
  );
}
