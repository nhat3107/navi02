import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  ROUTES,
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
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { FollowButton } from '../../features/user/components/FollowButton';

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavBar />

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        {phase === 'loading' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            Loading profile…
          </div>
        )}

        {phase === 'not-found' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Profile not found
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'me'
                ? 'Finish onboarding to set up your profile.'
                : "We couldn't find that user."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {mode === 'me' ? (
                <Link
                  to={ROUTES.ONBOARD}
                  className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Set up profile
                </Link>
              ) : (
                <Link
                  to={ROUTES.DISCOVER}
                  className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Discover people
                </Link>
              )}
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error ?? 'Something went wrong.'}
          </div>
        )}

        {phase === 'ready' && profile && (
          <ProfileHero
            profile={profile}
            isSelf={isSelf}
            viewerUserId={user?.id ?? null}
          />
        )}
      </main>
    </div>
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
  const postOwnerLabel = isSelf
    ? 'your posts'
    : `${profile.full_name?.trim() || `@${profile.username}`}'s posts`;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-32 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-rose-300 sm:h-40" />
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
          <UserAvatar
            label={profile.full_name || profile.username}
            src={profile.avatar_url}
            size="2xl"
            className="!ring-4"
          />
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {profile.full_name?.trim() || `@${profile.username}`}
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              @{profile.username}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isSelf ? (
              <Link
                to={ROUTES.SETTINGS_PROFILE}
                className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
                  className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Message
                </Link>
              </>
            )}
          </div>
        </div>

        {profile.bio?.trim() && (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {profile.bio}
          </p>
        )}

        <dl className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
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
              <span className="text-xs uppercase tracking-wider">Birthday</span>
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

        <nav className="mt-6 flex divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
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
        </nav>

        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-bg text-accent"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Posts section
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                This profile will show {postOwnerLabel} here once posting is enabled.
              </p>
            </div>
          </div>
        </section>
      </div>
    </article>
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
      className="flex flex-1 flex-col items-center gap-0.5 px-4 py-3 text-center transition hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {count}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </Link>
  );
}
