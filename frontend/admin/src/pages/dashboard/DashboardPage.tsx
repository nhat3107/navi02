import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats } from '../../features/dashboard/api/dashboard.api';
import { PostsChart } from '../../features/dashboard/components/PostsChart';
import { ActivityTimeline } from '../../features/dashboard/components/ActivityTimeline';
import {
  BlockedIcon,
  DashboardStatCard,
  PendingIcon,
  PostsIcon,
  ReportIcon,
  UsersIcon,
} from '../../features/dashboard/components/DashboardStatCard';
import { DashboardSkeleton } from '../../features/dashboard/components/DashboardSkeleton';
import { useAuthStore } from '../../features/auth/store/auth.store';
import type { DashboardStats } from '../../features/users/types/users.types';
import { ROUTES } from '../../shared/constants/routes';
import { Button } from '../../shared/components/Button';

function queueLabel(count: number, singular: string, plural: string): string {
  if (count === 0) return 'All clear';
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function DashboardPage() {
  const admin = useAuthStore((s) => s.admin);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchDashboardStats());
    } catch {
      setError('Could not load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const queueTotal = useMemo(() => {
    if (!stats) return 0;
    return stats.pendingPosts + stats.reportedPosts;
  }, [stats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="dashboard-page">
        <div className="alert alert--error">{error ?? 'Unknown error'}</div>
        <Button variant="secondary" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  const greeting = admin?.email
    ? `Welcome back, ${admin.email.split('@')[0]}`
    : 'Welcome back';

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <p className="dashboard-hero__eyebrow">Moderation overview</p>
          <h1>{greeting}</h1>
          <p>
            Track queues, member activity, and platform health at a glance.
          </p>
        </div>
        <div className="dashboard-hero__actions">
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
          {stats.pendingPosts > 0 ? (
            <Link to={ROUTES.POSTS_PENDING} className="btn btn--primary dash-btn-link">
              Review pending
            </Link>
          ) : null}
        </div>
      </header>

      {queueTotal > 0 ? (
        <div className="dashboard-alert">
          <div className="dashboard-alert__icon" aria-hidden>
            <PendingIcon />
          </div>
          <div className="dashboard-alert__body">
            <strong>Action needed</strong>
            <p>
              {queueLabel(stats.pendingPosts, 'post', 'posts')} awaiting review
              {stats.reportedPosts > 0
                ? ` · ${queueLabel(stats.reportedPosts, 'report', 'reports')} flagged`
                : ''}
              .
            </p>
          </div>
          <div className="dashboard-alert__links">
            {stats.pendingPosts > 0 ? (
              <Link to={ROUTES.POSTS_PENDING}>Pending</Link>
            ) : null}
            {stats.reportedPosts > 0 ? (
              <Link to={ROUTES.POSTS_REPORTED}>Reported</Link>
            ) : null}
            <Link to={ROUTES.REPORTS}>All reports</Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-alert dashboard-alert--ok">
          <div className="dashboard-alert__body">
            <strong>Queues are clear</strong>
            <p>No pending posts or reports need attention right now.</p>
          </div>
        </div>
      )}

      <div className="dash-stat-grid">
        <DashboardStatCard
          label="Members"
          value={stats.totalUsers}
          hint="Platform users"
          to={ROUTES.USERS}
          variant="violet"
          icon={<UsersIcon />}
        />
        <DashboardStatCard
          label="Total posts"
          value={stats.totalPosts}
          hint="Published & pending"
          variant="indigo"
          icon={<PostsIcon />}
        />
        <DashboardStatCard
          label="Pending review"
          value={stats.pendingPosts}
          hint={stats.pendingPosts > 0 ? 'Needs moderation' : 'Up to date'}
          to={ROUTES.POSTS_PENDING}
          variant="amber"
          icon={<PendingIcon />}
          highlight={stats.pendingPosts > 0}
        />
        <DashboardStatCard
          label="Reported"
          value={stats.reportedPosts}
          hint={stats.reportedPosts > 0 ? 'Review queue' : 'No flags'}
          to={ROUTES.POSTS_REPORTED}
          variant="rose"
          icon={<ReportIcon />}
          highlight={stats.reportedPosts > 0}
        />
        <DashboardStatCard
          label="Blocked"
          value={stats.blockedUsers}
          hint="Active blocks"
          to={ROUTES.USERS}
          variant="slate"
          icon={<BlockedIcon />}
        />
      </div>

      <div className="dashboard-panels">
        <PostsChart data={stats.postsOverTime ?? []} />
        <ActivityTimeline items={stats.recentActivity ?? []} />
      </div>
    </div>
  );
}
