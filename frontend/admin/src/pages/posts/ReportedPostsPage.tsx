import { useCallback, useEffect, useState } from 'react';
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

export function ReportedPostsPage() {
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

  const handleApprove = async (postId: string) => {
    setActionId(postId);
    try {
      await approvePostApi(postId);
      setItems((prev) => prev.filter((i) => i.post.id !== postId));
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
    } catch {
      setError('Failed to remove post.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Moderation queue"
        title="Reported posts"
        description="Published posts with open user reports."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? <LoadingState label="Loading reported posts…" /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No reported posts"
          description="Flagged posts will appear here for review."
        />
      ) : null}

      <div className="mod-list">
        {items.map(({ post, reports }) => (
          <PostModerationCard
            key={post.id}
            post={post}
            reports={reports}
            loading={actionId === post.id}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}
