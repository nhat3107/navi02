import { useCallback, useEffect, useState } from 'react';
import {
  approvePostApi,
  fetchPendingPosts,
  rejectPostApi,
} from '../../features/posts/api/posts.api';
import { PostModerationCard } from '../../features/posts/components/PostModerationCard';
import type { AdminPost } from '../../features/posts/types/posts.types';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';

export function PendingPostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchPendingPosts({ limit: 50 }));
    } catch {
      setError('Could not load pending posts.');
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
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
        title="Pending posts"
        description="AI-flagged posts waiting for admin approval."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? <LoadingState label="Loading pending posts…" /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          description="No pending posts need review right now."
        />
      ) : null}

      <div className="mod-list">
        {posts.map((post) => (
          <PostModerationCard
            key={post.id}
            post={post}
            loading={actionId === post.id}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}
