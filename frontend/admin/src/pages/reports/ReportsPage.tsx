import { useCallback, useEffect, useState } from 'react';
import {
  fetchReports,
  reviewReportApi,
} from '../../features/reports/api/reports.api';
import { ReportCard } from '../../features/reports/components/ReportCard';
import type { AdminReport } from '../../features/posts/types/posts.types';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';

type StatusFilter = 'pending' | 'all';
type ReviewAction = 'uphold' | 'dismiss';

export function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [confirm, setConfirm] = useState<{
    reportId: string;
    action: ReviewAction;
  } | null>(null);

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

  const runReview = async (reportId: string, action: ReviewAction) => {
    setActionId(reportId);
    try {
      await reviewReportApi(reportId, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setConfirm(null);
    } catch {
      setError('Failed to review report.');
    } finally {
      setActionId(null);
    }
  };

  const confirmCopy =
    confirm?.action === 'uphold'
      ? {
          title: 'Uphold report?',
          message:
            'This will remove the reported content and apply a penalty to the author when applicable.',
          confirmLabel: 'Uphold & remove',
          confirmVariant: 'danger' as const,
        }
      : {
          title: 'Dismiss report?',
          message: 'The report will be closed and the content will stay visible.',
          confirmLabel: 'Dismiss report',
          confirmVariant: 'primary' as const,
        };

  return (
    <div className="page reports-page">
      <PageHeader
        eyebrow="Trust & safety"
        title="Reports"
        description="Review user flags and open reported posts when needed."
        actions={
          <div className="reports-filter" role="tablist" aria-label="Report status filter">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'pending'}
              className={`reports-filter__btn${statusFilter === 'pending' ? ' reports-filter__btn--active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`reports-filter__btn${statusFilter === 'all' ? ' reports-filter__btn--active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? <LoadingState label="Loading reports…" /> : null}

      {!loading && reports.length === 0 ? (
        <EmptyState
          title="No reports to show"
          description={
            statusFilter === 'pending'
              ? 'New user flags will land here for review.'
              : 'Try switching back to pending reports.'
          }
        />
      ) : null}

      <div className="reports-list">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            busy={actionId === report.id}
            onDismiss={(id) => setConfirm({ reportId: id, action: 'dismiss' })}
            onUphold={(id) => setConfirm({ reportId: id, action: 'uphold' })}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.confirmLabel}
        confirmVariant={confirmCopy.confirmVariant}
        confirming={actionId !== null}
        onClose={() => !actionId && setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          void runReview(confirm.reportId, confirm.action);
        }}
      />
    </div>
  );
}
