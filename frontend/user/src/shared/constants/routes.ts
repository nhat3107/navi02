export const ROUTES = {
  HOME: '/',
  DISCOVER: '/discover',
  /** In-app notifications */
  NOTIFICATIONS: '/notifications',
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
  /** Hash anchor on profile page for account / penalty status */
  PROFILE_ACCOUNT_STATUS_HASH: 'account-status',
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
  /** Single post — comments, likes, report. */
  POST: '/post/:postId',
} as const;

/** Path to a post detail screen. */
export const buildPostPath = (postId: string): string =>
  `/post/${encodeURIComponent(postId)}`;

/**
 * Pass on `navigate(to, { state })` or `<Link state />` so the post opens as an
 * overlay while the previous screen stays mounted underneath (see `AppRouter`).
 */
export type PostOverlayNavigationState = {
  backgroundLocation: import('react-router-dom').Location;
};

/** Build profile path with account-status section focused. */
export const PROFILE_ACCOUNT_STATUS_HASH = ROUTES.PROFILE_ACCOUNT_STATUS_HASH;
export const buildProfileAccountStatusPath = (): string =>
  `${ROUTES.PROFILE_ME}#${PROFILE_ACCOUNT_STATUS_HASH}`;

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
  USER_ACCOUNT_STATUS: 'user/account-status',
  USER_ONBOARDING: 'user/onboarding',
  USER_CLOUDINARY_SIGNATURE: 'user/cloudinary-upload-signature',
  USER_SEARCH: 'user/search',
  USER_SUGGESTIONS: 'user/suggestions',
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
  NETWORK_FEED: 'network/feed',
  NETWORK_POSTS: 'network/posts',
  NETWORK_COMMENTS: 'network/comments',
  NETWORK_REPORTS: 'network/reports',
  NOTIFICATIONS: 'notifications',
} as const;

/** `network/posts/:id` — get/patch/delete post; append `/like` for like routes. */
export const apiNetworkPostById = (postId: string): string =>
  `network/posts/${encodeURIComponent(postId)}`;

export const apiNetworkPostShare = (postId: string): string =>
  `${apiNetworkPostById(postId)}/share`;

export const apiNetworkPostsByAuthor = (authorId: string): string =>
  `network/posts/author/${encodeURIComponent(authorId)}`;

export const apiNetworkCommentsByPost = (postId: string): string =>
  `network/comments/post/${encodeURIComponent(postId)}`;

export const apiNetworkCommentReplies = (parentCommentId: string): string =>
  `network/comments/${encodeURIComponent(parentCommentId)}/replies`;

export const apiNetworkCommentById = (commentId: string): string =>
  `network/comments/${encodeURIComponent(commentId)}`;

export const apiConversationLeave = (conversationId: string): string =>
  `conversations/${encodeURIComponent(conversationId)}/leave`;

export const apiConversationMembers = (conversationId: string): string =>
  `conversations/${encodeURIComponent(conversationId)}/members`;
