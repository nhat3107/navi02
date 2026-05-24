import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { fetchFeed } from '../../features/network/api/network.api';
import type { NetworkPost } from '../../features/network/types/network.types';
import { useAuthorProfiles } from '../../features/network/hooks/useAuthorProfiles';
import { EmptyState } from '../../shared/components/EmptyState';
import { AppPage } from '../../shared/layout/AppPage';
import { ROUTES } from '../../shared/constants/routes';
import { FeedComposer } from '../../features/network/components/FeedComposer';
import { PostCard } from '../../features/network/components/PostCard';
import { SuggestedPeoplePanel } from '../../features/user/components/SuggestedPeoplePanel';

const PAGE = 15;

/**
 * `/` — Home / feed for signed-in users.
 */
export function HomePage() {
  const { user } = useAuthStore();
  const myProfile = useProfileCache((s) => s.myProfile);

  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchFeed(PAGE, 0);
      setPosts(data);
      setSkip(data.length);
      setHasMore(data.length >= PAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const { data } = await fetchFeed(PAGE, skip);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of data) {
          if (!seen.has(p.id)) merged.push(p);
        }
        return merged;
      });
      setSkip((s) => s + data.length);
      setHasMore(data.length >= PAGE);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, skip]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '160px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const authorIds = posts.flatMap((p) =>
    [p.authorId, p.originalPost?.authorId].filter(Boolean) as string[],
  );
  const { byId: authorById } = useAuthorProfiles(authorIds);

  const displayName =
    (myProfile?.username ? `@${myProfile.username}` : user?.email) || 'You';

  return (
    <AppPage mainClassName="home-page">
      <div className="home-layout">
        <div className="home-layout__composer">
          <FeedComposer
            displayName={displayName}
            avatarUrl={myProfile?.avatar_url ?? null}
            onPosted={() => void refreshFeed()}
          />
        </div>

        <aside className="home-layout__rail" aria-label="Friend recommendations">
          <SuggestedPeoplePanel
            viewerUserId={user?.id ?? null}
            limit={6}
            layout="list"
            hideWhenEmpty
            title="People you may know"
          />
        </aside>

        <div className="home-layout__feed">
          <section aria-label="Feed" className="space-y-5">
          {loading && (
            <>
              <FeedSkeleton />
              <FeedSkeleton />
            </>
          )}

          {!loading && posts.length === 0 && (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
              }
              title="No posts yet"
              description="Follow people or share something to get started."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link to={ROUTES.DISCOVER} className="chip-btn chip-btn--primary">
                    Find people
                  </Link>
                  <Link to={ROUTES.CHAT} className="chip-btn">
                    Messages
                  </Link>
                </div>
              }
            />
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={authorById[post.authorId]}
              originalAuthor={
                post.originalPost
                  ? authorById[post.originalPost.authorId]
                  : undefined
              }
              viewerUserId={user?.id ?? null}
              mode="feed"
              onChanged={() => void refreshFeed()}
              onReposted={(repost) => {
                setPosts((prev) => [repost, ...prev.filter((p) => p.id !== repost.id)]);
              }}
              onPostDeleted={() =>
                setPosts((prev) => prev.filter((p) => p.id !== post.id))
              }
            />
          ))}
        </section>

        <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
        {loadingMore && <FeedSkeleton />}
        {!loading && !loadingMore && posts.length > 0 && !hasMore && (
          <p className="py-6 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            You're all caught up.
          </p>
        )}
        </div>
      </div>

      <ChatFloatingBubble />
    </AppPage>
  );
}

/**
 * Desktop-only shortcut to chat — mobile already has Messages in the bottom tab bar.
 */
function ChatFloatingBubble() {
  return (
    <Link
      to={ROUTES.CHAT}
      aria-label="Open messages"
      title="Messages"
      className="group fixed bottom-8 right-8 z-30 hidden items-center gap-2 rounded-full border border-violet-200/80 bg-white px-4 py-3 text-violet-700 shadow-[0_8px_28px_-8px_rgba(91,33,182,0.35)] ring-1 ring-violet-100 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/40 md:inline-flex dark:border-violet-500/30 dark:bg-slate-900 dark:text-violet-300 dark:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.55)] dark:ring-violet-500/20 dark:hover:border-violet-400/40 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
    >
      <ChatBubbleIcon />
      <span className="pr-1 text-sm font-semibold tracking-tight">Messages</span>
    </Link>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="transition-transform group-hover:-rotate-6"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function FeedSkeleton() {
  return (
    <div className="surface-card animate-pulse">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="aspect-square w-full animate-pulse bg-slate-100 dark:bg-slate-900" />
      <div className="space-y-2 px-5 py-4">
        <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
