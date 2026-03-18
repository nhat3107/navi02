export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

export const API_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  OAUTH_GOOGLE: '/auth/oauth/google',
  OAUTH_GITHUB: '/auth/oauth/github',
} as const;
