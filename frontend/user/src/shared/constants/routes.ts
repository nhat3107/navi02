export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  ONBOARD: '/onboard',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

/** Most paths are relative to `VITE_API_URL` (`.../api`). OAuth GET uses gateway origin only (see `getOAuthUrl`). */
export const API_ROUTES = {
  SIGNIN: 'auth/signin',
  SIGNUP: 'auth/signup',
  VERIFY_OTP: 'auth/verify-otp',
  RESEND_OTP: 'auth/resend-otp',
  REFRESH: 'auth/refresh',
  SIGNOUT: 'auth/signout',
  USER_PROFILE: 'user/profile',
  USER_ONBOARDING: 'user/onboarding',
  /** GET — browser redirect; matches api-gateway auth.controller. */
  OAUTH_GOOGLE: 'auth/google',
  OAUTH_GITHUB: 'auth/github',
} as const;
