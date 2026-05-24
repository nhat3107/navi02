export type ViolationLevel = 'clean' | 'warning' | 'restricted' | 'severe';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  account_status: string;
  violationCount: number;
  violationLevel: ViolationLevel;
  block_until: string | null;
  postBlockUntil: string | null;
  isAccountBlocked: boolean;
  isPostBlocked: boolean;
  createdAt: string;
}

export interface AiModerationConfig {
  enabled: boolean;
  temperature: number;
  categoryThresholds: Record<string, number>;
  updatedAt: string;
}

export interface DashboardActivity {
  type: string;
  message: string;
  at: string;
  refId: string;
}

export interface PostsOverTimePoint {
  date: string;
  count: number;
}

export type ReportsOverTimePoint = PostsOverTimePoint;

export type UsersOverTimePoint = PostsOverTimePoint;

export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  reportedPosts: number;
  blockedUsers: number;
  postsOverTime: PostsOverTimePoint[];
  reportsOverTime: ReportsOverTimePoint[];
  usersOverTime: UsersOverTimePoint[];
  recentActivity: DashboardActivity[];
}

export function violationLevelLabel(level: ViolationLevel, count: number): string {
  switch (level) {
    case 'clean':
      return 'Clean';
    case 'warning':
      return `Warning (${count}/3)`;
    case 'restricted':
      return `Restricted (${count} violations)`;
    case 'severe':
      return `Severe (${count} violations)`;
    default:
      return level;
  }
}
