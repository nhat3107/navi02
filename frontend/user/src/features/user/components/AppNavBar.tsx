import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../../auth/store/auth.store';
import { getProfileApi } from '../../auth/api/auth.api';
import { fetchNotificationsUnreadApi } from '../../notification/api/notifications.api';
import { fetchMyFollowing } from '../api/userProfile.api';
import { useProfileCache } from '../store/profileCache.store';
import { useNotificationsStore } from '../../notification/store/notifications.store';
import { ROUTES } from '../../../shared/constants/routes';
import { UserAvatar } from './UserAvatar';
import { NotificationNavBell } from '../../notification/components/NotificationNavBell';
import { ThemeToggleButton } from '../../../shared/components/ThemeToggle';
import { LogoutButton } from '../../auth/components/LogoutButton';

const NAV_ITEMS = [
  { to: ROUTES.HOME, label: 'Home', mobileLabel: 'Home', icon: 'home' },
  { to: ROUTES.DISCOVER, label: 'Discover', mobileLabel: 'Discover', icon: 'compass' },
  { to: ROUTES.CHAT, label: 'Messages', mobileLabel: 'Chat', icon: 'chat' },
  { to: ROUTES.PROFILE_ME, label: 'Profile', mobileLabel: 'Profile', icon: 'user' },
] as const;

function NavIcon({ name }: { name: string }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    'aria-hidden': true as const,
    className: 'h-[1.125rem] w-[1.125rem]',
  };

  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case 'compass':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...props}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
        </svg>
      );
    default:
      return null;
  }
}

function navLinkClass(isActive: boolean, mobile = false) {
  if (mobile) {
    return `mobile-nav__link${isActive ? ' mobile-nav__link--active' : ''}`;
  }
  return `app-top-nav__link${isActive ? ' app-top-nav__link--active' : ''}`;
}

/**
 * App-shell navbar for the signed-in social area (home, discover, chat, profile, etc.).
 */
export function AppNavBar() {
  const location = useLocation();
  const hideMobileTopBar = location.pathname === ROUTES.CHAT;
  const { user, isAuthenticated } = useAuthStore();
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
        /* navbar should never block */
      }
      try {
        const edges = await fetchMyFollowing();
        if (!cancelled) setFollowingIds(edges.map((e) => e.id));
      } catch {
        /* ignore */
      }
      try {
        const n = await fetchNotificationsUnreadApi();
        if (!cancelled) useNotificationsStore.getState().setUnreadFromApi(n);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, myProfile, setMyProfile, setFollowingIds]);

  if (!isAuthenticated) return null;

  const displayName =
    (myProfile?.username ? `@${myProfile.username}` : user?.email) || 'You';

  return (
    <>
      <header
        className={`app-top-nav${hideMobileTopBar ? ' max-md:hidden' : ''}`}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Link to={ROUTES.HOME} className="app-top-nav__brand">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white shadow-md"
            >
              N
            </span>
            <span className="hidden text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:block">
              Navi
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.HOME}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggleButton />
            <NotificationNavBell />
            <Link
              to={ROUTES.PROFILE_ME}
              title={displayName}
              className="app-top-nav__profile"
            >
              <UserAvatar
                label={displayName}
                src={myProfile?.avatar_url ?? null}
                size="sm"
              />
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-800 dark:text-slate-200 lg:block">
                {displayName}
              </span>
            </Link>

            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.HOME}
            className={({ isActive }) => navLinkClass(isActive, true)}
          >
            <span className="mobile-nav__icon">
              <NavIcon name={item.icon} />
            </span>
            <span className="max-w-full truncate px-0.5">{item.mobileLabel}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
