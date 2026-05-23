import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { useAuthStore } from '../features/auth/store/auth.store';
import { LogoutButton } from '../features/auth/components/LogoutButton';

const NAV = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'grid' },
  { to: ROUTES.POSTS_PENDING, label: 'Pending posts', icon: 'clock' },
  { to: ROUTES.POSTS_REPORTED, label: 'Reported posts', icon: 'flag' },
  { to: ROUTES.REPORTS, label: 'Reports', icon: 'alert' },
  { to: ROUTES.USERS, label: 'Users', icon: 'users' },
  { to: ROUTES.ADMINS, label: 'Admin accounts', icon: 'shield' },
  { to: ROUTES.AI_SETTINGS, label: 'AI settings', icon: 'spark' },
] as const;

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'flag':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M5 3v18M5 4h12l-2 4 2 4H5" />
        </svg>
      );
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3 20 7v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z" />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
          <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminLayout() {
  const admin = useAuthStore((s) => s.admin);

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <div className="admin-shell__brand">
          <div className="admin-shell__logo" aria-hidden>
            N
          </div>
          <div>
            <strong>Navi Admin</strong>
            <span>Moderation console</span>
          </div>
        </div>

        <nav className="admin-shell__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `admin-shell__link${isActive ? ' admin-shell__link--active' : ''}`
              }
            >
              <span className="admin-shell__link-icon">
                <NavIcon name={item.icon} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-shell__footer">
          <div className="admin-shell__user">
            <span className="admin-shell__user-label">Signed in as</span>
            <span className="admin-shell__user-email">{admin?.email}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="admin-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
