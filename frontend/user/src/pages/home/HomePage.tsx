import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { Button } from '../../shared/components/Button';
import { ROUTES } from '../../shared/constants/routes';
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { fetchFeed } from '../../features/network/api/network.api';
import type { NetworkPost } from '../../features/network/types/network.types';
import { useAuthorProfiles } from '../../features/network/hooks/useAuthorProfiles';
import { FeedComposer } from '../../features/network/components/FeedComposer';
import { PostCard } from '../../features/network/components/PostCard';

const PAGE = 15;

/**
 * `/` — Home / feed. Guests see marketing; signed-in users see composer + feed.
 */
export function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const myProfile = useProfileCache((s) => s.myProfile);
  const navigate = useNavigate();

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
    if (!isAuthenticated) return;
    void refreshFeed();
  }, [isAuthenticated, refreshFeed]);

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
    if (!isAuthenticated) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isAuthenticated, loadMore]);

  const authorIds = posts.map((p) => p.authorId);
  const { byId: authorById } = useAuthorProfiles(authorIds);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100 -tracking-wide mb-2">
            Welcome to Navi
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Connect, follow, and chat with the people you care about.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={() => navigate(ROUTES.LOGIN)} className="w-auto">
              Sign in
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.REGISTER)}
              className="w-auto"
            >
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    myProfile?.full_name?.trim() ||
    (myProfile?.username ? `@${myProfile.username}` : user?.email) ||
    'You';

  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-black">
      <AppNavBar />

      <main className="mx-auto w-full max-w-[min(100%,640px)] px-3 pb-12 pt-4 sm:px-4 sm:pt-6">
        <FeedComposer
          displayName={displayName}
          avatarUrl={myProfile?.avatar_url ?? null}
          onPosted={() => void refreshFeed()}
        />

        <section aria-label="Feed" className="space-y-5">
          {loading && (
            <>
              <FeedSkeleton />
              <FeedSkeleton />
            </>
          )}

          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                No posts yet
              </h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                Follow people or share something to get started.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link
                  to={ROUTES.DISCOVER}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0095f6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1877f2]"
                >
                  Find people
                </Link>
                <Link
                  to={ROUTES.CHAT}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  Messages
                </Link>
              </div>
            </div>
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={authorById[post.authorId]}
              viewerUserId={user?.id ?? null}
              mode="feed"
              onChanged={() => void refreshFeed()}
            />
          ))}
        </section>

        <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
        {loadingMore && <FeedSkeleton />}
        {!loading && !loadingMore && posts.length > 0 && !hasMore && (
          <p className="py-6 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
            You're all caught up.
          </p>
        )}
      </main>

      <ChatFloatingBubble />
    </div>
  );
}

/**
 * Floating action bubble anchored bottom-right that takes the user straight to
 * their messages. Stays on top of feed content via `z-40`, gracefully hides on
 * very narrow viewports so it doesn't cover the last post.
 */
function ChatFloatingBubble() {
  return (
    <Link
      to={ROUTES.CHAT}
      aria-label="Open messages"
      title="Messages"
      className="group fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-4 py-3 text-white shadow-[0_18px_42px_-12px_rgba(139,92,246,0.55)] ring-1 ring-white/40 transition-all hover:scale-[1.04] hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 dark:ring-white/10 sm:bottom-8 sm:right-8"
    >
      <span
        aria-hidden
        className="absolute -right-1 -top-1 inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white shadow-[0_0_0_2px_rgba(16,185,129,0.35)] dark:ring-neutral-950"
      />
      <ChatBubbleIcon />
      <span className="hidden pr-1 text-sm font-semibold tracking-tight sm:inline">
        Messages
      </span>
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
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="h-11 w-11 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-2.5 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
      <div className="aspect-square w-full animate-pulse bg-neutral-100 dark:bg-neutral-900" />
      <div className="space-y-2 px-5 py-4">
        <div className="h-7 w-24 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
