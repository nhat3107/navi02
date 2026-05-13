import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../../auth/store/auth.store';
import { signOutApi, getProfileApi } from '../../auth/api/auth.api';
import { fetchNotificationsUnreadApi } from '../../notification/api/notifications.api';
import { fetchMyFollowing } from '../api/userProfile.api';
import { useProfileCache } from '../store/profileCache.store';
import { useNotificationsStore } from '../../notification/store/notifications.store';
import { ROUTES } from '../../../shared/constants/routes';
import { UserAvatar } from './UserAvatar';
import { NotificationNavBell } from '../../notification/components/NotificationNavBell';

const NAV_ITEMS = [
  { to: ROUTES.HOME, label: 'Home' },
  { to: ROUTES.DISCOVER, label: 'Discover' },
  { to: ROUTES.CHAT, label: 'Messages' },
  { to: ROUTES.PROFILE_ME, label: 'Profile' },
] as const;

/**
 * App-shell navbar for the social area (home, discover, profile, settings,
 * follower lists). Not rendered on chat or call routes — those have their
 * own immersive headers.
 *
 * Side effect: hydrates `useProfileCache` with the signed-in user's profile
 * and follow-set the first time it mounts, so every downstream page sees a
 * warm cache and FollowButtons paint in the right state immediately.
 */
export function AppNavBar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const myProfile = useProfileCache((s) => s.myProfile);
  const setMyProfile = useProfileCache((s) => s.setMyProfile);
  const setFollowingIds = useProfileCache((s) => s.setFollowingIds);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        if (!myProfile) {
          const res = await getProfileApi();
          if (!cancelled) setMyProfile(res.data);
        }
      } catch {
        /* navbar should never block; profile pages re-fetch when needed */
      }
      try {
        const edges = await fetchMyFollowing();
        if (!cancelled) setFollowingIds(edges.map((e) => e.id));
      } catch {
        /* ignore — empty set is a fine default */
      }
      try {
        const n = await fetchNotificationsUnreadApi();
        if (!cancelled)
          useNotificationsStore.getState().setUnreadFromApi(n);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, myProfile, setMyProfile, setFollowingIds]);

  const handleLogout = async () => {
    try {
      await signOutApi();
    } catch {
      /* still clear local session */
    }
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  if (!isAuthenticated) return null;

  const displayName =
    myProfile?.full_name?.trim() ||
    (myProfile?.username ? `@${myProfile.username}` : user?.email) ||
    'You';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link
          to={ROUTES.HOME}
          className="flex shrink-0 items-center gap-2 rounded-2xl px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-md"
          >
            N
          </span>
          <span className="hidden text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:block">
            Navi
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.HOME}
              className={({ isActive }) =>
                `shrink-0 rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-bg text-accent'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <NotificationNavBell />
          <Link
            to={ROUTES.PROFILE_ME}
            title={displayName}
            className="flex shrink-0 items-center gap-2 rounded-full p-0.5 pr-3 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <UserAvatar
              label={displayName}
              src={myProfile?.avatar_url ?? null}
              size="sm"
            />
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-800 dark:text-slate-200 sm:block">
              {displayName}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden shrink-0 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-block"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
