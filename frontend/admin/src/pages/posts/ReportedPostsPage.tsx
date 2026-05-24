import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  approvePostApi,
  fetchReportedPosts,
  rejectPostApi,
} from '../../features/posts/api/posts.api';
import { PostModerationCard } from '../../features/posts/components/PostModerationCard';
import type { ReportedPostItem } from '../../features/posts/types/posts.types';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { ROUTES } from '../../shared/constants/routes';

export function ReportedPostsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusPostId = searchParams.get('post');
  const [items, setItems] = useState<ReportedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchReportedPosts({ limit: 50 }));
    } catch {
      setError('Could not load reported posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const focusedItem = useMemo(
    () => (focusPostId ? items.find((i) => i.post.id === focusPostId) : null),
    [items, focusPostId],
  );

  const visibleItems = useMemo(() => {
    if (!focusPostId) return items;
    return focusedItem ? [focusedItem] : [];
  }, [items, focusPostId, focusedItem]);

  const clearFocus = () => {
    if (!focusPostId) return;
    const next = new URLSearchParams(searchParams);
    next.delete('post');
    setSearchParams(next, { replace: true });
  };

  const handleApprove = async (postId: string) => {
    setActionId(postId);
    try {
      await approvePostApi(postId);
      setItems((prev) => prev.filter((i) => i.post.id !== postId));
      if (focusPostId === postId) {
        navigate(ROUTES.REPORTS, { replace: true });
      }
    } catch {
      setError('Failed to approve post.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (postId: string) => {
    if (!window.confirm('Remove this post and apply a penalty to the author?')) {
      return;
    }
    setActionId(postId);
    try {
      await rejectPostApi(postId);
      setItems((prev) => prev.filter((i) => i.post.id !== postId));
      if (focusPostId === postId) {
        navigate(ROUTES.REPORTS, { replace: true });
      }
    } catch {
      setError('Failed to remove post.');
    } finally {
      setActionId(null);
    }
  };

  const isSingleView = Boolean(focusPostId);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Moderation queue"
        title={isSingleView ? 'Review reported post' : 'Reported posts'}
        description={
          isSingleView
            ? 'Inspect this post and its open reports, then keep or remove it.'
            : 'Posts flagged by users. Review content and report reasons together.'
        }
        actions={
          isSingleView ? (
            <div className="page-hero__actions">
              <Link to={ROUTES.REPORTS} className="btn btn--secondary">
                Back to reports
              </Link>
              <button type="button" className="btn btn--secondary" onClick={clearFocus}>
                All reported posts
              </button>
            </div>
          ) : undefined
        }
      />

      {focusPostId && !loading && !focusedItem ? (
        <div className="alert alert--error">
          This post is no longer in the reported queue.
          <div className="report-focus-banner__links">
            <Link to={ROUTES.REPORTS}>Back to reports</Link>
            <button type="button" className="report-focus-banner__clear" onClick={clearFocus}>
              View all reported posts
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? <LoadingState label="Loading reported posts…" /> : null}

      {!loading && !focusPostId && items.length === 0 ? (
        <EmptyState
          title="No reported posts"
          description="Flagged posts will appear here for review."
        />
      ) : null}

      {!loading && visibleItems.length > 0 ? (
        <div className="mod-list">
          {visibleItems.map(({ post, reports }) => (
            <PostModerationCard
              key={post.id}
              post={post}
              reports={reports}
              highlighted={isSingleView}
              loading={actionId === post.id}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
