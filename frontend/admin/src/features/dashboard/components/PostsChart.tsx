import type { PostsOverTimePoint } from '../../users/types/users.types';
import { DashBarChart } from './DashBarChart';

interface PostsChartProps {
  data: PostsOverTimePoint[];
}

export function PostsChart({ data }: PostsChartProps) {
  return (
    <DashBarChart
      variant="posts"
      title="Posts activity"
      subtitle="New posts over the last 7 days"
      emptyLabel="No post data yet."
      ariaLabel="Posts created per day for the last week"
      data={data}
    />
  );
}
