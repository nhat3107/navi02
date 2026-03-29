export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ONBOARD: '/onboard',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

export const API_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ONBOARD: '/auth/onboard',
  OAUTH_GOOGLE: '/auth/oauth/google',
  OAUTH_GITHUB: '/auth/oauth/github',
} as const;
