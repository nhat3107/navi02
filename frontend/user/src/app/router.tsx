import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { OAuthReturnHandler } from './OAuthReturnHandler';
import { LoginPage } from '../pages/auth/login/LoginPage';
import { RegisterPage } from '../pages/auth/register/RegisterPage';
import { VerifyOtpPage } from '../pages/auth/verify-otp/VerifyOtpPage';
import { OnboardPage } from '../pages/auth/onboard/OnboardPage';
import { OAuthCallback } from '../pages/auth/oauth/OAuthCallback';
import { HomePage } from '../pages/home/HomePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <OAuthReturnHandler />
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtpPage />} />
        <Route path={ROUTES.ONBOARD} element={<OnboardPage />} />
        <Route path={ROUTES.OAUTH_CALLBACK} element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
