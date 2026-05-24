import { Outlet, useLocation } from 'react-router-dom';
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { ROUTES } from '../constants/routes';

/** Shared chrome for signed-in app sections: top bar + mobile tab bar + page outlet. */
export function AppShellLayout() {
  const location = useLocation();
  const isChatRoute = location.pathname === ROUTES.CHAT;

  return (
    <div className={`app-page${isChatRoute ? ' app-page--chat' : ''}`}>
      <div className="app-shell">
        <AppNavBar />
        <div className="app-shell__main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
