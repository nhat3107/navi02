import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES, buildProfilePath } from '../../shared/constants/routes';
import { searchUsers, type UserSearchHit } from '../../features/user/api/userDirectory.api';
import { fetchMyFollowing } from '../../features/user/api/userProfile.api';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { AppPage } from '../../shared/layout/AppPage';
import { PageHeader } from '../../shared/components/PageHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { FollowButton } from '../../features/user/components/FollowButton';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;

/**
 * `/discover` — search for people by name or @username (`GET /user/search`).
 *
 * - Below 2 chars we show a "Suggested" panel of accounts the viewer is NOT
 *   yet following. Suggestions are derived from the cached follow-set on the
 *   server's "people we follow" endpoint, then filtered to the not-yet-
 *   followed; this keeps Discover useful even before the user types.
 * - When typing, we debounce the API call so we don't spam the gateway.
 * - Each row has a follow button driven by the same cache.
 */
export function DiscoverPage() {
  const viewerUserId = useAuthStore((s) => s.user?.id ?? null);
  const followingIds = useProfileCache((s) => s.followingIds);
  const setFollowingIds = useProfileCache((s) => s.setFollowingIds);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<UserSearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Hydrate the follow-set so suggestions filter correctly even on a fresh
  // mount where the navbar effect hasn't completed yet.
  useEffect(() => {
    if (!viewerUserId) return;
    if (followingIds.size > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const edges = await fetchMyFollowing();
        if (!cancelled) setFollowingIds(edges.map((e) => e.id));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerUserId, followingIds.size, setFollowingIds]);

  // Debounced search.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setHits(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const id = ++requestIdRef.current;

    const t = window.setTimeout(async () => {
      try {
        const rows = await searchUsers(trimmed);
        if (id !== requestIdRef.current) return;
        setHits(rows);
      } catch (e) {
        if (id !== requestIdRef.current) return;
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Search failed.';
        setError(typeof message === 'string' ? message : 'Search failed.');
        setHits([]);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [query]);

  const showResults = query.trim().length >= MIN_QUERY;
  const filteredHits = useMemo(
    () => (hits ?? []).filter((h) => h.id !== viewerUserId),
    [hits, viewerUserId],
  );

  return (
    <AppPage mainClassName="max-w-3xl">
        <PageHeader
          eyebrow="People"
          title="Discover"
          description="Find people, follow them, and start a conversation."
        />

        <div className="mb-5">
          <label className="relative block">
            <span className="sr-only">Search people</span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @username"
              className="search-input"
              autoFocus
            />
          </label>
          {!showResults && (
            <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
              Type at least {MIN_QUERY} characters to search.
            </p>
          )}
        </div>

        {showResults ? (
          <ResultsCard
            loading={loading}
            error={error}
            hits={filteredHits}
            viewerUserId={viewerUserId}
          />
        ) : (
          <SuggestionsCard viewerUserId={viewerUserId} />
        )}
    </AppPage>
  );
}

function ResultsCard({
  loading,
  error,
  hits,
  viewerUserId,
}: {
  loading: boolean;
  error: string | null;
  hits: UserSearchHit[];
  viewerUserId: string | null;
}) {
  return (
    <section className="surface-card">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Results
        </h2>
        {!loading && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hits.length} {hits.length === 1 ? 'match' : 'matches'}
          </span>
        )}
      </header>
      {loading && <LoadingState label="Searching…" />}
      {!loading && error && (
        <div className="p-6 text-center text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}
      {!loading && !error && hits.length === 0 && (
        <EmptyState
          title="No matches"
          description="No people match that search. Try a different name or username."
        />
      )}
      {!loading && !error && hits.length > 0 && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {hits.map((hit) => (
            <li key={hit.id}>
              <PersonRow
                id={hit.id}
                username={hit.username}
                fullName={hit.full_name}
                avatarUrl={hit.avatar_url}
                viewerUserId={viewerUserId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SuggestionsCard({ viewerUserId }: { viewerUserId: string | null }) {
  const followingIds = useProfileCache((s) => s.followingIds);
  return (
    <section className="surface-card">
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Why not start here?
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Search above to find someone, or jump straight into the app.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <Link
          to={ROUTES.PROFILE_ME}
          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-accent hover:bg-accent-bg dark:border-slate-800 dark:bg-slate-800/40"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Your profile
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Polish your bio &amp; photo so people recognize you.
          </p>
        </Link>
        <Link
          to={ROUTES.CHAT}
          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-accent hover:bg-accent-bg dark:border-slate-800 dark:bg-slate-800/40"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Open messages
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Start a chat or jump back into a recent conversation.
          </p>
        </Link>
        <Link
          to={ROUTES.PROFILE_ME_FOLLOWING}
          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-accent hover:bg-accent-bg dark:border-slate-800 dark:bg-slate-800/40"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Manage follows
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            You're following {followingIds.size}{' '}
            {followingIds.size === 1 ? 'person' : 'people'}.
          </p>
        </Link>
      </div>
      {!viewerUserId && (
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Sign in to follow people and start chatting.
        </div>
      )}
    </section>
  );
}

function PersonRow({
  id,
  username,
  fullName,
  avatarUrl,
  viewerUserId,
}: {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  viewerUserId: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={buildProfilePath(id)} className="shrink-0">
        <UserAvatar label={fullName || username} src={avatarUrl} size="md" />
      </Link>
      <Link to={buildProfilePath(id)} className="min-w-0 flex-1 group">
        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-accent dark:text-slate-100">
          {fullName?.trim() || `@${username}`}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          @{username}
        </p>
      </Link>
      <FollowButton
        targetUserId={id}
        viewerUserId={viewerUserId}
        targetLabel={`@${username}`}
      />
    </div>
  );
}
