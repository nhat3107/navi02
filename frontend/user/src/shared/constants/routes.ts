export const ROUTES = {
  HOME: '/',
  DISCOVER: '/discover',
  CHAT: '/chat',
  /** Full-screen VideoSDK room */
  CALL: '/call',
  /** Authenticated user's own profile */
  PROFILE_ME: '/profile',
  /** Authenticated user's followers list */
  PROFILE_ME_FOLLOWERS: '/profile/followers',
  /** Authenticated user's following list */
  PROFILE_ME_FOLLOWING: '/profile/following',
  /** Edit profile (avatar / bio / display name / dob / gender / username) */
  SETTINGS_PROFILE: '/settings/profile',
  /**
   * Other user profile by userId. Backend exposes /user/profile/:userId, so
   * we route by id; when usernames-as-routes are needed later we resolve via
   * /user/search.
   */
  PROFILE: '/u/:userId',
  PROFILE_FOLLOWERS: '/u/:userId/followers',
  PROFILE_FOLLOWING: '/u/:userId/following',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  ONBOARD: '/onboard',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

/** Build a profile path for someone else by userId. */
export const buildProfilePath = (userId: string): string =>
  `/u/${encodeURIComponent(userId)}`;
export const buildProfileFollowersPath = (userId: string): string =>
  `/u/${encodeURIComponent(userId)}/followers`;
export const buildProfileFollowingPath = (userId: string): string =>
  `/u/${encodeURIComponent(userId)}/following`;

/** API helpers: gateway exposes per-user profile/follow endpoints by id. */
export const apiUserProfileById = (userId: string): string =>
  `user/profile/${encodeURIComponent(userId)}`;
export const apiUserFollow = (userId: string): string =>
  `user/follow/${encodeURIComponent(userId)}`;
export const apiUserFollowersById = (userId: string): string =>
  `user/${encodeURIComponent(userId)}/followers`;
export const apiUserFollowingById = (userId: string): string =>
  `user/${encodeURIComponent(userId)}/following`;

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
  /** Followers/following — me */
  USER_FOLLOWERS_ME: 'user/followers',
  USER_FOLLOWING_ME: 'user/following',
  /** Helpers below build per-user paths (require interpolation). */
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  CONVERSATIONS_GROUP: 'conversations/group',
  CALL_TOKEN: 'call/token',
  CALL_ROOM: 'call/room',
  /** GET — browser redirect; matches api-gateway auth.controller. */
  OAUTH_GOOGLE: 'auth/google',
  OAUTH_GITHUB: 'auth/github',
} as const;
