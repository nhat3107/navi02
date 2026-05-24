import { Link } from 'react-router-dom';
import type { AdminReport } from '../../posts/types/posts.types';
import { Button } from '../../../shared/components/Button';
import { reportedPostRoute } from '../../../shared/constants/routes';
import {
  formatRelativeTime,
  formatUsername,
  reportStatusLabel,
  shortId,
  targetTypeLabel,
  truncateText,
} from '../../../shared/utils/format';

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function ReportedContent({ report }: { report: AdminReport }) {
  const post = report.targetPost;

  if (report.targetType !== 'post' || !post) {
    return (
      <p className="reports-card__section-text">
        {targetTypeLabel(report.targetType)} · {shortId(report.targetId, 14)}
      </p>
    );
  }

  const preview = post.content.trim()
    ? truncateText(post.content, 120)
    : post.mediaUrls.length > 0
      ? 'Media-only post'
      : 'Empty post';

  return (
    <div className="reports-card__preview-row">
      {post.mediaUrls[0] ? (
        isVideoUrl(post.mediaUrls[0]) ? (
          <video src={post.mediaUrls[0]} className="reports-card__thumb" muted />
        ) : (
          <img src={post.mediaUrls[0]} alt="" className="reports-card__thumb" />
        )
      ) : null}
      <div>
        <p className="reports-card__author">
          {formatUsername(post.authorId, post.authorUsername)}
        </p>
        <p className="reports-card__section-text">{preview}</p>
      </div>
    </div>
  );
}

interface ReportCardProps {
  report: AdminReport;
  busy?: boolean;
  onDismiss: (id: string) => void;
  onUphold: (id: string) => void;
}

export function ReportCard({ report, busy = false, onDismiss, onUphold }: ReportCardProps) {
  const isPending = report.status === 'pending';
  const post = report.targetType === 'post' ? report.targetPost : null;

  return (
    <article className={`reports-card reports-card--${report.status}`}>
      <div className="reports-card__head">
        <div className="reports-card__badges">
          <span className={`reports-pill reports-pill--${report.status}`}>
            {reportStatusLabel(report.status)}
          </span>
          <span className="reports-pill reports-pill--type">
            {targetTypeLabel(report.targetType)}
          </span>
        </div>
        <span className="reports-card__meta">
          {formatRelativeTime(report.createdAt)} · reporter{' '}
          {formatUsername(report.reporterId, report.reporterUsername)}
        </span>
      </div>

      <div className="reports-card__sections">
        <section className="reports-card__section">
          <h3 className="reports-card__section-label">Report reason</h3>
          <p className="reports-card__section-text">{report.description}</p>
        </section>
        <section className="reports-card__section">
          <h3 className="reports-card__section-label">Reported content</h3>
          <ReportedContent report={report} />
        </section>
      </div>

      {isPending || post ? (
        <footer className="reports-card__footer">
          {post ? (
            <Link
              to={reportedPostRoute(post.id)}
              className="btn btn--secondary reports-card__review-link"
            >
              Review post
            </Link>
          ) : null}
          {isPending ? (
            <div className="reports-card__actions">
              <Button variant="secondary" disabled={busy} onClick={() => onDismiss(report.id)}>
                Dismiss
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => onUphold(report.id)}>
                Uphold & remove
              </Button>
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
