import { useCallback, useEffect, useState } from 'react';
import {
  fetchReports,
  reviewReportApi,
} from '../../features/reports/api/reports.api';
import type { AdminReport } from '../../features/posts/types/posts.types';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatRelativeTime } from '../../shared/utils/format';

export function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReports({
        limit: 50,
        status: statusFilter === 'pending' ? 'pending' : undefined,
      });
      setReports(data);
    } catch {
      setError('Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReview = async (reportId: string, action: 'uphold' | 'dismiss') => {
    const label =
      action === 'uphold'
        ? 'Uphold this report (remove post + penalty)?'
        : 'Dismiss this report and keep the post?';
    if (!window.confirm(label)) return;

    setActionId(reportId);
    try {
      await reviewReportApi(reportId, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch {
      setError('Failed to review report.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Trust & safety"
        title="Reports"
        description="Review user-submitted content reports."
        actions={
          <select
            className="select select--header"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'pending' | 'all')
            }
          >
            <option value="pending">Pending only</option>
            <option value="all">All statuses</option>
          </select>
        }
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? <LoadingState label="Loading reports…" /> : null}
      {!loading && reports.length === 0 ? (
        <EmptyState
          title="No reports to show"
          description={
            statusFilter === 'pending'
              ? 'Pending reports will appear here.'
              : 'Try changing the status filter.'
          }
        />
      ) : null}

      <div className="mod-list">
        {reports.map((report) => (
          <article key={report.id} className="mod-card">
            <header className="mod-card__header">
              <div>
                <span className={`badge badge--${report.status}`}>
                  {report.status}
                </span>
                <span className="mod-card__meta">
                  {report.targetType} · {formatRelativeTime(report.createdAt)}
                </span>
              </div>
              <span className="mod-card__id">#{report.id.slice(-8)}</span>
            </header>
            <p className="mod-card__content">{report.description}</p>
            <p className="mod-card__meta">
              Target {report.targetId.slice(0, 12)}… · Reporter{' '}
              {report.reporterId.slice(0, 8)}…
            </p>
            {report.status === 'pending' ? (
              <div className="mod-card__actions">
                <Button
                  variant="secondary"
                  disabled={actionId === report.id}
                  onClick={() => handleReview(report.id, 'dismiss')}
                >
                  Dismiss
                </Button>
                <Button
                  disabled={actionId === report.id}
                  onClick={() => handleReview(report.id, 'uphold')}
                >
                  Uphold & remove
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
