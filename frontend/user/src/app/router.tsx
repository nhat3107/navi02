import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { ChatSocketProvider, NotificationSocketProvider } from '../shared/socket/SocketProvider';
import { CallSignalBridge } from '../features/call/components/CallSignalBridge';
import { CallIncomingBanner } from '../features/call/components/CallIncomingBanner';
import { CallInOtherTabIndicator } from '../features/call/components/CallInOtherTabIndicator';
import { CallProvider } from '../features/call/components/CallProvider';
import { MiniCallBar } from '../features/call/components/MiniCallBar';
import { ThemeToggle } from '../shared/components/ThemeToggle';
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
            <CallSignalBridge />
            <CallIncomingBanner />
            <CallInOtherTabIndicator />
            <MiniCallBar />
            <ThemeToggle />
            <OAuthReturnHandler />
            <Routes>
            <Route
              path={ROUTES.HOME}
              element={
                <RequireUserProfile>
                  <HomePage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.CHAT}
              element={
                <RequireUserProfile>
                  <ChatPage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.CALL}
              element={
                <RequireUserProfile>
                  <CallRoomPage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.DISCOVER}
              element={
                <RequireUserProfile>
                  <DiscoverPage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.NOTIFICATIONS}
              element={
                <RequireUserProfile>
                  <NotificationsPage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.POST}
              element={
                <RequireUserProfile>
                  <PostDetailPage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.PROFILE_ME}
              element={
                <RequireUserProfile>
                  <ProfilePage mode="me" />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.PROFILE_ME_FOLLOWERS}
              element={
                <RequireUserProfile>
                  <FollowEdgesPage mode="me-followers" />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.PROFILE_ME_FOLLOWING}
              element={
                <RequireUserProfile>
                  <FollowEdgesPage mode="me-following" />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.SETTINGS_PROFILE}
              element={
                <RequireUserProfile>
                  <EditProfilePage />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.PROFILE}
              element={
                <RequireUserProfile>
                  <ProfilePage mode="other" />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.PROFILE_FOLLOWERS}
              element={
                <RequireUserProfile>
                  <FollowEdgesPage mode="user-followers" />
                </RequireUserProfile>
              }
            />
            <Route
              path={ROUTES.PROFILE_FOLLOWING}
              element={
                <RequireUserProfile>
                  <FollowEdgesPage mode="user-following" />
                </RequireUserProfile>
              }
            />
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
        </CallProvider>
        </NotificationSocketProvider>
      </ChatSocketProvider>
    </BrowserRouter>
  );
}
