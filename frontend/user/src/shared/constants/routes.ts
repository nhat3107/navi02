export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  ONBOARD: '/onboard',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

/** Paths are relative to `VITE_API_URL` (includes `/api` prefix). */
export const API_ROUTES = {
  SIGNIN: 'auth/signin',
  SIGNUP: 'auth/signup',
  VERIFY_OTP: 'auth/verify-otp',
  RESEND_OTP: 'auth/resend-otp',
  REFRESH: 'auth/refresh',
  SIGNOUT: 'auth/signout',
  USER_PROFILE: 'user/profile',
  USER_ONBOARDING: 'user/onboarding',
  OAUTH_GOOGLE: 'auth/oauth/google',
  OAUTH_GITHUB: 'auth/oauth/github',
} as const;
