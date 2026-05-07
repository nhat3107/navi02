import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { ROUTES, buildProfilePath } from '../../shared/constants/routes';
import { useAuthStore } from '../../features/auth/store/auth.store';
import {
  fetchMyFollowers,
  fetchMyFollowing,
  fetchUserFollowers,
  fetchUserFollowing,
  fetchUserProfile,
} from '../../features/user/api/userProfile.api';
import type { FollowEdge, UserProfile } from '../../features/user/types/user.types';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { FollowButton } from '../../features/user/components/FollowButton';
import { extractApiMessage } from '../../shared/utils/api-error';

type Mode = 'me-followers' | 'me-following' | 'user-followers' | 'user-following';

interface FollowEdgesPageProps {
  mode: Mode;
}

const TITLE: Record<Mode, string> = {
  'me-followers': 'Your followers',
  'me-following': 'You follow',
  'user-followers': 'Followers',
  'user-following': 'Following',
};

const EMPTY_COPY: Record<Mode, string> = {
  'me-followers': "You don't have any followers yet. Share your profile to grow your circle.",
  'me-following': 'You\'re not following anyone yet. Discover people to start your feed.',
  'user-followers': 'No followers yet.',
  'user-following': 'Not following anyone yet.',
};

/**
 * One page used by four routes:
 *   `/profile/followers`, `/profile/following` (own)
 *   `/u/:userId/followers`, `/u/:userId/following` (other)
 *
 * Each row carries a `<FollowButton />` that consults `useProfileCache` so
 * the active state is correct even when the same row appears on multiple
 * lists.
 */
export function FollowEdgesPage({ mode }: FollowEdgesPageProps) {
  const params = useParams<{ userId: string }>();
  const viewerUserId = useAuthStore((s) => s.user?.id ?? null);
  const cachedTarget = useProfileCache((s) =>
    mode.startsWith('user-') && params.userId ? s.profiles[params.userId] : null,
  );
  const setProfile = useProfileCache((s) => s.setProfile);

  const [edges, setEdges] = useState<FollowEdge[] | null>(null);
  const [target, setTarget] = useState<UserProfile | null>(cachedTarget);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error' | 'not-found'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const targetUserId = mode.startsWith('user-') ? params.userId ?? null : null;

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setError(null);
    setEdges(null);

    void (async () => {
      try {
        let rows: FollowEdge[] = [];
        if (mode === 'me-followers') rows = await fetchMyFollowers();
        else if (mode === 'me-following') rows = await fetchMyFollowing();
        else if (mode === 'user-followers') {
          if (!targetUserId) {
            setPhase('not-found');
            return;
          }
          rows = await fetchUserFollowers(targetUserId);
          // Resolve the target's name lazily — non-fatal if it fails.
          fetchUserProfile(targetUserId)
            .then((p) => {
              if (!cancelled) {
                setTarget(p);
                setProfile(p);
              }
            })
            .catch(() => {
              /* ignore */
            });
        } else if (mode === 'user-following') {
          if (!targetUserId) {
            setPhase('not-found');
            return;
          }
          rows = await fetchUserFollowing(targetUserId);
          fetchUserProfile(targetUserId)
            .then((p) => {
              if (!cancelled) {
                setTarget(p);
                setProfile(p);
              }
            })
            .catch(() => {
              /* ignore */
            });
        }
        if (cancelled) return;
        setEdges(rows);
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        const status = (e as AxiosError).response?.status;
        if (status === 404) {
          setPhase('not-found');
          return;
        }
        setError(extractApiMessage(e, 'Could not load list.'));
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, targetUserId, setProfile]);

  const filteredEdges = useMemo(() => {
    if (!edges) return [];
    const q = query.trim().toLowerCase();
    if (!q) return edges;
    return edges.filter(
      (e) =>
        e.username.toLowerCase().includes(q) ||
        (e.full_name ?? '').toLowerCase().includes(q),
    );
  }, [edges, query]);

  const heading = useMemo(() => {
    const base = TITLE[mode];
    if (mode.startsWith('user-')) {
      const who = target?.full_name?.trim() || (target?.username ? `@${target.username}` : null);
      return who ? `${base} of ${who}` : base;
    }
    return base;
  }, [mode, target]);

  const backLink =
    mode.startsWith('user-') && targetUserId
      ? buildProfilePath(targetUserId)
      : ROUTES.PROFILE_ME;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavBar />

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to={backLink}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Back to profile"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
              {heading}
            </h1>
            {edges && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {edges.length} {edges.length === 1 ? 'person' : 'people'}
              </p>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label className="relative block">
            <span className="sr-only">Filter list</span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or @username"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-bg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {phase === 'loading' && (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
          )}
          {phase === 'error' && (
            <div className="p-6 text-center text-sm text-red-600 dark:text-red-300">
              {error ?? 'Something went wrong.'}
            </div>
          )}
          {phase === 'not-found' && (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              We couldn't find that user.
            </div>
          )}
          {phase === 'ready' && filteredEdges.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {edges && edges.length > 0
                ? 'No people match that filter.'
                : EMPTY_COPY[mode]}
            </div>
          )}
          {phase === 'ready' && filteredEdges.length > 0 && (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEdges.map((edge) => (
                <li key={edge.id}>
                  <FollowEdgeRow edge={edge} viewerUserId={viewerUserId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function FollowEdgeRow({
  edge,
  viewerUserId,
}: {
  edge: FollowEdge;
  viewerUserId: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={buildProfilePath(edge.id)} className="shrink-0">
        <UserAvatar
          label={edge.full_name || edge.username}
          src={edge.avatar_url}
          size="md"
        />
      </Link>
      <Link to={buildProfilePath(edge.id)} className="min-w-0 flex-1 group">
        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-accent dark:text-slate-100">
          {edge.full_name?.trim() || `@${edge.username}`}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          @{edge.username}
        </p>
      </Link>
      <FollowButton
        targetUserId={edge.id}
        viewerUserId={viewerUserId}
        targetLabel={`@${edge.username}`}
      />
    </div>
  );
}
