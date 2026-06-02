import { useState } from 'react';
import type { AdminPost, AdminReport } from '../types/posts.types';
import {
  formatRelativeTime,
  formatUsername,
  truncateText,
  visibilityLabel,
} from '../../../shared/utils/format';
import { Button } from '../../../shared/components/Button';

interface PostModerationCardProps {
  post: AdminPost;
  reports?: AdminReport[];
  loading?: boolean;
  highlighted?: boolean;
  onApprove: (postId: string) => void;
  onReject: (postId: string) => void;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function PostModerationCard({
  post,
  reports,
  loading = false,
  highlighted = false,
  onApprove,
  onReject,
}: PostModerationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const content = post.content.trim();
  const showExpand = content.length > 280;
  const displayContent =
    expanded || !showExpand ? content : truncateText(content, 280);

  return (
    <article
      id={`post-${post.id}`}
      className={`mod-card${highlighted ? ' mod-card--highlight' : ''}`}
    >
      <header className="mod-card__header">
        <div>
          <div className="mod-card__badges">
            <span className={`badge badge--${post.visibility}`}>
              {visibilityLabel(post.visibility)}
            </span>
            {reports && reports.length > 0 ? (
              <span className="badge badge--pending">
                {reports.length} report{reports.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <span className="mod-card__meta">
            Author {formatUsername(post.authorId, post.authorUsername)} ·{' '}
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>
        <span className="mod-card__id">#{post.id.slice(-8)}</span>
      </header>

      {content ? (
        <div className="mod-card__body">
          <p className="mod-card__content">{displayContent}</p>
          {showExpand ? (
            <button
              type="button"
              className="mod-card__expand"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Show full post'}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mod-card__content mod-card__content--muted">No text content</p>
      )}

      {post.mediaUrls.length > 0 ? (
        <ul className="mod-card__media mod-card__media--grid">
          {post.mediaUrls.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="mod-card__media-link">
                {isVideoUrl(url) ? (
                  <video src={url} controls className="mod-card__thumb" />
                ) : (
                  <img src={url} alt="" className="mod-card__thumb" />
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mod-card__stats">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
        <span>{post.shareCount} shares</span>
      </div>

      {reports && reports.length > 0 ? (
        <div className="mod-card__reports">
          <strong className="mod-card__reports-title">Report reasons</strong>
          <ul className="mod-card__reports-list">
            {reports.map((r) => (
              <li key={r.id} className="mod-card__report-item">
                <p className="mod-card__report-text">{r.description}</p>
                <p className="mod-card__meta">
                  {formatRelativeTime(r.createdAt)} · reporter{' '}
                  {formatUsername(r.reporterId, r.reporterUsername)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mod-card__actions">
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => onReject(post.id)}
        >
          Remove post
        </Button>
        <Button disabled={loading} onClick={() => onApprove(post.id)}>
          Keep post
        </Button>
      </div>
    </article>
  );
}
