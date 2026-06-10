import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import type { Location as RouterLocation } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { ChatSocketProvider, NotificationSocketProvider } from '../shared/socket/SocketProvider';
import { CallSignalBridge } from '../features/call/components/CallSignalBridge';
import { CallSessionLifecycle } from '../features/call/components/CallSessionLifecycle';
import { CallIncomingBanner } from '../features/call/components/CallIncomingBanner';
import { CallInOtherTabIndicator } from '../features/call/components/CallInOtherTabIndicator';
import { CallProvider } from '../features/call/components/CallProvider';
import { MiniCallBar } from '../features/call/components/MiniCallBar';
import { OAuthReturnHandler } from './OAuthReturnHandler';
import { LoginPage } from '../pages/auth/login/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/forgot-password/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/reset-password/ResetPasswordPage';
import { RegisterPage } from '../pages/auth/register/RegisterPage';
import { VerifyOtpPage } from '../pages/auth/verify-otp/VerifyOtpPage';
import { OnboardPage } from '../pages/auth/onboard/OnboardPage';
import { OAuthCallback } from '../pages/auth/oauth/OAuthCallback';
import { HomePage } from '../pages/home/HomePage';
import { ChatPage } from '../pages/chat/ChatPage';
import { CallRoomPage } from '../pages/call/CallRoomPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { FollowEdgesPage } from '../pages/profile/FollowEdgesPage';
import { EditProfilePage } from '../pages/settings/EditProfilePage';
import { DiscoverPage } from '../pages/discover/DiscoverPage';
import { PostDetailPage } from '../pages/post/PostDetailPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { RequireUserProfile } from './RequireUserProfile';
import { ProtectedLayout } from '../shared/layout/ProtectedLayout';

/**
 * Renders primary routes at `location.state.backgroundLocation` when present so
 * the underlying page stays visible, then stacks a second `<Routes>` for
 * `/post/:postId` as a modal (`PostDetailPage overlay`).
 */
function AppShellRoutes() {
  const location = useLocation();
  const background = (
    location.state as { backgroundLocation?: RouterLocation } | undefined
  )?.backgroundLocation;

  return (
    <>
      <CallSignalBridge />
      <CallSessionLifecycle />
      <CallIncomingBanner />
      <CallInOtherTabIndicator />
      <MiniCallBar />
      <OAuthReturnHandler />
      <Routes location={background ?? location}>
            <Route element={<ProtectedLayout />}>
            <Route
              path={ROUTES.HOME}
              element={<HomePage />}
            />
            <Route
              path={ROUTES.CHAT}
              element={<ChatPage />}
            />
            <Route
              path={ROUTES.CALL}
              element={<CallRoomPage />}
            />
            <Route
              path={ROUTES.DISCOVER}
              element={<DiscoverPage />}
            />
            <Route
              path={ROUTES.NOTIFICATIONS}
              element={<NotificationsPage />}
            />
            <Route
              path={ROUTES.POST}
              element={<PostDetailPage />}
            />
            <Route
              path={ROUTES.PROFILE_ME}
              element={<ProfilePage mode="me" />}
            />
            <Route
              path={ROUTES.PROFILE_ME_FOLLOWERS}
              element={<FollowEdgesPage mode="me-followers" />}
            />
            <Route
              path={ROUTES.PROFILE_ME_FOLLOWING}
              element={<FollowEdgesPage mode="me-following" />}
            />
            <Route
              path={ROUTES.SETTINGS_PROFILE}
              element={<EditProfilePage />}
            />
            <Route
              path={ROUTES.PROFILE}
              element={<ProfilePage mode="other" />}
            />
            <Route
              path={ROUTES.PROFILE_FOLLOWERS}
              element={<FollowEdgesPage mode="user-followers" />}
            />
            <Route
              path={ROUTES.PROFILE_FOLLOWING}
              element={<FollowEdgesPage mode="user-following" />}
            />
            </Route>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route
              path={ROUTES.FORGOT_PASSWORD}
              element={<ForgotPasswordPage />}
            />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtpPage />} />
            <Route path={ROUTES.ONBOARD} element={<OnboardPage />} />
            <Route path={ROUTES.OAUTH_CALLBACK} element={<OAuthCallback />} />
      </Routes>
      {background ? (
        <Routes>
          <Route
            path={ROUTES.POST}
            element={
              <RequireUserProfile>
                <PostDetailPage overlay />
              </RequireUserProfile>
            }
          />
        </Routes>
      ) : null}
    </>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ChatSocketProvider>
        <NotificationSocketProvider>
          {/*
            CallProvider lifts MeetingProvider above <Routes>: when a call is
            active, MeetingProvider keeps the SDK connection alive across
            navigation. The route components just consume `useMeeting()`.
          */}
          <CallProvider>
            <AppShellRoutes />
          </CallProvider>
        </NotificationSocketProvider>
      </ChatSocketProvider>
    </BrowserRouter>
  );
}
