import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { LoginPage } from '../pages/auth/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PendingPostsPage } from '../pages/posts/PendingPostsPage';
import { ReportedPostsPage } from '../pages/posts/ReportedPostsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { UsersPage } from '../pages/users/UsersPage';
import { AdminsPage } from '../pages/admins/AdminsPage';
import { AiSettingsPage } from '../pages/ai/AiSettingsPage';
import { AdminLayout } from '../layout/AdminLayout';
import { RequireAdminAuth } from './RequireAdminAuth';
import { RedirectIfAuthenticated } from './RedirectIfAuthenticated';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={ROUTES.LOGIN}
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          element={
            <RequireAdminAuth>
              <AdminLayout />
            </RequireAdminAuth>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.POSTS_PENDING} element={<PendingPostsPage />} />
          <Route path={ROUTES.POSTS_REPORTED} element={<ReportedPostsPage />} />
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.USERS} element={<UsersPage />} />
          <Route path={ROUTES.ADMINS} element={<AdminsPage />} />
          <Route path={ROUTES.AI_SETTINGS} element={<AiSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
