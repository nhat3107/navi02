export const ROUTES = {
  HOME: '/',
  CHAT: '/chat',
  /** Full-screen VideoSDK room */
  CALL: '/call',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
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
  FORGET_PASSWORD: 'auth/forget-passwd',
  RESET_PASSWORD: 'auth/reset-passwd',
  USER_PROFILE: 'user/profile',
  USER_ONBOARDING: 'user/onboarding',
  USER_CLOUDINARY_SIGNATURE: 'user/cloudinary-upload-signature',
  USER_SEARCH: 'user/search',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  CONVERSATIONS_GROUP: 'conversations/group',
  CALL_TOKEN: 'call/token',
  CALL_ROOM: 'call/room',
  /** GET — browser redirect; matches api-gateway auth.controller. */
  OAUTH_GOOGLE: 'auth/google',
  OAUTH_GITHUB: 'auth/github',
} as const;
