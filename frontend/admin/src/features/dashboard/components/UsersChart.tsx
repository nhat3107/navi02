import { Link } from 'react-router-dom';
import type { UsersOverTimePoint } from '../../users/types/users.types';
import { ROUTES } from '../../../shared/constants/routes';
import { DashBarChart } from './DashBarChart';

interface UsersChartProps {
  data: UsersOverTimePoint[];
}

export function UsersChart({ data }: UsersChartProps) {
  return (
    <DashBarChart
      variant="users"
      title="User activity"
      subtitle="New member signups over the last 7 days"
      emptyLabel="No new signups this week."
      ariaLabel="Member signups per day for the last week"
      data={data}
    />
  );
}

export function UsersChartFooterLink() {
  return (
    <Link to={ROUTES.USERS} className="dash-dashboard-cell__link">
      Manage members →
    </Link>
  );
}
