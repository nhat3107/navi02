export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/admin/dashboard',
  POSTS_PENDING: '/admin/posts/pending',
  POSTS_REPORTED: '/admin/posts/reported',
  REPORTS: '/admin/reports',
  USERS: '/admin/users',
  ADMINS: '/admin/admins',
  AI_SETTINGS: '/admin/ai-settings',
} as const;

/** Relative to `VITE_API_URL` (e.g. http://localhost:3000/api). */
export const API_ROUTES = {
  ADMIN_LOGIN: 'admin/auth/login',
  ADMIN_DASHBOARD: 'admin/dashboard',
  ADMIN_POSTS_PENDING: 'admin/posts/pending',
  ADMIN_POSTS_REPORTED: 'admin/posts/reported',
  ADMIN_REPORTS: 'admin/reports',
  ADMIN_USERS: 'admin/users',
  ADMIN_ADMINS: 'admin/admins',
  ADMIN_AI_CONFIG: 'admin/ai/config',
} as const;

export const apiAdminPostApprove = (postId: string): string =>
  `admin/posts/${encodeURIComponent(postId)}/approve`;

export const apiAdminPostDelete = (postId: string): string =>
  `admin/posts/${encodeURIComponent(postId)}`;

export const apiAdminReportReview = (reportId: string): string =>
  `admin/reports/${encodeURIComponent(reportId)}/review`;

export const apiAdminUserBlock = (userId: string): string =>
  `admin/users/${encodeURIComponent(userId)}/block`;

export const apiAdminUserUnblock = (userId: string): string =>
  `admin/users/${encodeURIComponent(userId)}/unblock`;

export const apiAdminUserResetPenalty = (userId: string): string =>
  `admin/users/${encodeURIComponent(userId)}/reset-penalty`;
