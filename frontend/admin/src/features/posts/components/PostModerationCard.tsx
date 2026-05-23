import type { AdminPost } from '../types/posts.types';
import { formatRelativeTime, visibilityLabel } from '../../../shared/utils/format';
import { Button } from '../../../shared/components/Button';

interface PostModerationCardProps {
  post: AdminPost;
  reports?: { id: string; description: string; reporterId: string }[];
  loading?: boolean;
  onApprove: (postId: string) => void;
  onReject: (postId: string) => void;
}

export function PostModerationCard({
  post,
  reports,
  loading = false,
  onApprove,
  onReject,
}: PostModerationCardProps) {
  return (
    <article className="mod-card">
      <header className="mod-card__header">
        <div>
          <span className={`badge badge--${post.visibility}`}>
            {visibilityLabel(post.visibility)}
          </span>
          <span className="mod-card__meta">
            Author {post.authorId.slice(0, 8)}… · {formatRelativeTime(post.createdAt)}
          </span>
        </div>
        <span className="mod-card__id">#{post.id.slice(-8)}</span>
      </header>

      {post.content ? (
        <p className="mod-card__content">{post.content}</p>
      ) : (
        <p className="mod-card__content mod-card__content--muted">No text content</p>
      )}

      {post.mediaUrls.length > 0 ? (
        <ul className="mod-card__media">
          {post.mediaUrls.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {url.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <video src={url} controls className="mod-card__thumb" />
                ) : (
                  <img src={url} alt="" className="mod-card__thumb" />
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {reports && reports.length > 0 ? (
        <div className="mod-card__reports">
          <strong>Reports ({reports.length})</strong>
          <ul>
            {reports.map((r) => (
              <li key={r.id}>
                <span>{r.description}</span>
                <span className="mod-card__meta">
                  by {r.reporterId.slice(0, 8)}…
                </span>
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
          Remove
        </Button>
        <Button disabled={loading} onClick={() => onApprove(post.id)}>
          Approve
        </Button>
      </div>
    </article>
  );
}
