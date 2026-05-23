import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  ROUTES,
  PROFILE_ACCOUNT_STATUS_HASH,
  buildProfileFollowersPath,
  buildProfileFollowingPath,
} from '../../shared/constants/routes';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { getProfileApi } from '../../features/auth/api/auth.api';
import {
  fetchMyFollowing,
  fetchUserProfile,
} from '../../features/user/api/userProfile.api';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import type { UserProfile } from '../../features/user/types/user.types';
import { AppPage } from '../../shared/layout/AppPage';
import { LoadingState } from '../../shared/components/LoadingState';
import { EmptyState } from '../../shared/components/EmptyState';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { FollowButton } from '../../features/user/components/FollowButton';
import { fetchPostsByAuthor } from '../../features/network/api/network.api';
import type { NetworkPost } from '../../features/network/types/network.types';
import { useAuthorProfiles } from '../../features/network/hooks/useAuthorProfiles';
import { PostCard } from '../../features/network/components/PostCard';
import { fetchAccountStatusApi } from '../../features/user/api/accountStatus.api';
import type { AccountStatus } from '../../features/user/types/accountStatus.types';
import { PenaltyStatusCard } from '../../features/user/components/PenaltyStatusCard';

/**
 * `/profile` — own profile (uses cached `myProfile` first, refreshes in
 * background).
 * `/u/:userId` — anyone else's profile (404 → friendly fallback).
 *
 * Renders the same hero card in both modes. Action area swaps between
 * "Edit profile" (self) and `<FollowButton />` + "Message" (other).
 */
type Phase = 'loading' | 'ready' | 'not-found' | 'error';

interface ProfilePageProps {
  /** When true the route is `/profile`; otherwise we read `userId` from params. */
  mode: 'me' | 'other';
}

function formatBirthday(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatJoined(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

export function ProfilePage({ mode }: ProfilePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ userId: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const myProfile = useProfileCache((s) => s.myProfile);
  const cachedProfile = useProfileCache((s) =>
    mode === 'other' && params.userId ? s.profiles[params.userId] : null,
  );
  const setMyProfile = useProfileCache((s) => s.setMyProfile);
  const setProfile = useProfileCache((s) => s.setProfile);
  const setFollowingIds = useProfileCache((s) => s.setFollowingIds);

  const [phase, setPhase] = useState<Phase>('loading');
  const [profile, setLocalProfile] = useState<UserProfile | null>(
    mode === 'me' ? myProfile : cachedProfile,
  );
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(
    null,
  );
  const [highlightPenalty, setHighlightPenalty] = useState(false);

  const targetUserId =
    mode === 'me' ? user?.id ?? null : params.userId ?? null;
  const isSelf =
    Boolean(user?.id) &&
    Boolean(targetUserId) &&
    user!.id === targetUserId;

  useEffect(() => {
    if (mode === 'me' && !isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [mode, isAuthenticated, navigate]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        if (mode === 'me') {
          if (myProfile) {
            setLocalProfile(myProfile);
            setPhase('ready');
          } else {
            setPhase('loading');
          }
          const res = await getProfileApi();
          if (cancelled) return;
          setMyProfile(res.data);
          setLocalProfile(res.data);
          setPhase('ready');
          // Hydrate the follow-set so FollowButtons elsewhere paint correctly.
          fetchMyFollowing()
            .then((edges) => {
              if (!cancelled) setFollowingIds(edges.map((e) => e.id));
            })
            .catch(() => {
              /* ignore */
            });
        } else {
          const id = params.userId?.trim();
          if (!id) {
            setPhase('not-found');
            return;
          }
          if (cachedProfile) {
            setLocalProfile(cachedProfile);
            setPhase('ready');
          } else {
            setPhase('loading');
          }
          const fresh = await fetchUserProfile(id);
          if (cancelled) return;
          setProfile(fresh);
          setLocalProfile(fresh);
          setPhase('ready');
        }
      } catch (e) {
        if (cancelled) return;
        const status = (e as AxiosError).response?.status;
        if (status === 404) {
          setPhase('not-found');
          return;
        }
        if (status === 401) {
          navigate(ROUTES.LOGIN, { replace: true });
          return;
        }
        setError('Could not load profile.');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally re-run when `mode` or the URL `userId` changes.
    // The cached profile / myProfile hydrate the local state synchronously
    // but never trigger a re-fetch on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, params.userId]);

  useEffect(() => {
    if (mode !== 'me' || !isAuthenticated) {
      setAccountStatus(null);
      return;
    }
    let cancelled = false;
    void fetchAccountStatusApi()
      .then((status) => {
        if (!cancelled) setAccountStatus(status);
      })
      .catch(() => {
        if (!cancelled) setAccountStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, isAuthenticated]);

  useEffect(() => {
    if (mode !== 'me' || !accountStatus) return;
    if (location.hash !== `#${PROFILE_ACCOUNT_STATUS_HASH}`) return;
    setHighlightPenalty(true);
    requestAnimationFrame(() => {
      document.getElementById(PROFILE_ACCOUNT_STATUS_HASH)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    const timer = window.setTimeout(() => setHighlightPenalty(false), 2500);
    return () => window.clearTimeout(timer);
  }, [mode, location.hash, accountStatus]);

  return (
    <AppPage mainClassName="max-w-4xl">
        {phase === 'loading' && (
          <LoadingState label="Loading profile…" />
        )}

        {phase === 'not-found' && (
          <EmptyState
            title="Profile not found"
            description={
              mode === 'me'
                ? 'Finish onboarding to set up your profile.'
                : "We couldn't find that user."
            }
            action={
              mode === 'me' ? (
                <Link to={ROUTES.ONBOARD} className="chip-btn chip-btn--primary">
                  Set up profile
                </Link>
              ) : (
                <Link to={ROUTES.DISCOVER} className="chip-btn chip-btn--primary">
                  Discover people
                </Link>
              )
            }
          />
        )}

        {phase === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error ?? 'Something went wrong.'}
          </div>
        )}

        {phase === 'ready' && profile && (
          <>
            <ProfileHero
              profile={profile}
              isSelf={isSelf}
              viewerUserId={user?.id ?? null}
            />
            {mode === 'me' && accountStatus && (
              <PenaltyStatusCard
                status={accountStatus}
                highlight={highlightPenalty}
              />
            )}
            <ProfilePostsSection
              profileUserId={profile.id}
              viewerUserId={user?.id ?? null}
              isSelf={isSelf}
            />
          </>
        )}
    </AppPage>
  );
}

function ProfileHero({
  profile,
  isSelf,
  viewerUserId,
}: {
  profile: UserProfile;
  isSelf: boolean;
  viewerUserId: string | null;
}) {
  const hasMeta =
    Boolean(profile.gender) ||
    Boolean(profile.date_of_birth) ||
    Boolean(profile.createdAt);

  return (
    <article className="surface-card mb-5">
      <div className="h-24 bg-gradient-to-br from-violet-500/90 via-fuchsia-500/85 to-orange-400/80 sm:h-28" />
      <div className="px-4 pb-5 sm:px-6">
        <div className="-mt-10 flex flex-wrap items-end gap-4 sm:-mt-12">
          <UserAvatar
            label={profile.full_name || profile.username}
            src={profile.avatar_url}
            size="2xl"
            className="!ring-4"
          />
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-xl font-semibold text-neutral-900 sm:text-2xl dark:text-neutral-100">
              {profile.full_name?.trim() || `@${profile.username}`}
            </h1>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
              @{profile.username}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isSelf ? (
              <Link
                to={ROUTES.SETTINGS_PROFILE}
                className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Edit profile
              </Link>
            ) : (
              <>
                <FollowButton
                  targetUserId={profile.id}
                  viewerUserId={viewerUserId}
                  variant="wide"
                  targetLabel={`@${profile.username}`}
                />
                <Link
                  to={ROUTES.CHAT}
                  state={{ openWith: profile.id }}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  Message
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {(profile.bio?.trim() || hasMeta) && (
        <div className="border-t border-neutral-200 bg-neutral-50/90 px-4 py-5 sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/50">
          {profile.bio?.trim() && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {profile.bio}
            </p>
          )}
          {hasMeta && (
            <dl
              className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400 ${
                profile.bio?.trim() ? 'mt-4' : ''
              }`}
            >
              {profile.gender && (
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wider">Gender</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">
                    {profile.gender}
                  </span>
                </div>
              )}
              {profile.date_of_birth && (
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wider">
                    Birthday
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatBirthday(profile.date_of_birth)}
                  </span>
                </div>
              )}
              {profile.createdAt && (
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wider">Joined</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatJoined(profile.createdAt)}
                  </span>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      <nav className="border-t border-neutral-200 bg-neutral-100/80 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex divide-x divide-neutral-200 overflow-hidden dark:divide-neutral-800">
          <FollowStat
            to={
              isSelf
                ? ROUTES.PROFILE_ME_FOLLOWERS
                : buildProfileFollowersPath(profile.id)
            }
            label="Followers"
            count={profile.followers_count}
          />
          <FollowStat
            to={
              isSelf
                ? ROUTES.PROFILE_ME_FOLLOWING
                : buildProfileFollowingPath(profile.id)
            }
            label="Following"
            count={profile.following_count}
          />
        </div>
      </nav>
    </article>
  );
}

const PROFILE_POSTS_PAGE = 12;

function ProfilePostsSection({
  profileUserId,
  viewerUserId,
  isSelf,
}: {
  profileUserId: string;
  viewerUserId: string | null;
  isSelf: boolean;
}) {
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (fromSkip: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const { data } = await fetchPostsByAuthor(
          profileUserId,
          PROFILE_POSTS_PAGE,
          fromSkip,
        );
        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const next = [...prev];
            for (const p of data) {
              if (!seen.has(p.id)) next.push(p);
            }
            return next;
          });
        } else {
          setPosts(data);
        }
        setSkip(fromSkip + data.length);
        setHasMore(data.length >= PROFILE_POSTS_PAGE);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [profileUserId],
  );

  useEffect(() => {
    void load(0, false);
  }, [load]);

  const authorIds = posts.map((p) => p.authorId);
  const { byId: authorById } = useAuthorProfiles(authorIds);

  const pendingPosts = isSelf
    ? posts.filter((p) => p.visibility === 'pending')
    : [];
  const publishedPosts = isSelf
    ? posts.filter((p) => p.visibility !== 'pending')
    : posts;

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <>
      {pendingPosts.length > 0 && (
        <section
          className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5 dark:border-amber-900/40 dark:bg-amber-950/30 dark:shadow-none"
          aria-label="Posts under review"
        >
          <div className="mb-4 border-b border-amber-200/80 pb-3 dark:border-amber-900/50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-950 dark:text-amber-100">
              Under review
            </h2>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/90">
              Only you can see these posts until moderation finishes. You can delete
              them anytime.
            </p>
          </div>
          <div className="space-y-5">
            {pendingPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                author={authorById[post.authorId]}
                viewerUserId={viewerUserId}
                mode="feed"
                onChanged={() => void load(0, false)}
                onPostDeleted={() => handlePostDeleted(post.id)}
              />
            ))}
          </div>
        </section>
      )}

    <section
      className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-5 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none"
      aria-label="Posts"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
          Posts
        </span>
      </div>
      {loading && (
        <p className="py-6 text-center text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Loading…
        </p>
      )}
      {!loading && publishedPosts.length === 0 && pendingPosts.length === 0 && (
        <p className="py-10 text-center text-sm font-medium text-neutral-600 dark:text-neutral-300">
          No posts yet.
        </p>
      )}
      {!loading && publishedPosts.length === 0 && pendingPosts.length > 0 && (
        <p className="py-6 text-center text-sm font-medium text-neutral-600 dark:text-neutral-300">
          No published posts yet.
        </p>
      )}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {publishedPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            author={authorById[post.authorId]}
            viewerUserId={viewerUserId}
            mode="grid"
            onChanged={() => void load(0, false)}
          />
        ))}
      </div>
      {hasMore && !loading && posts.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(skip, true)}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
    </>
  );
}

function FollowStat({
  to,
  label,
  count,
}: {
  to: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-0.5 px-4 py-3 text-center transition hover:bg-neutral-50 dark:hover:bg-neutral-900/80"
    >
      <span className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {count}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
    </Link>
  );
}
