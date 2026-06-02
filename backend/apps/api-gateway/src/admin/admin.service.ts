import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

const ADMIN_KAFKA_RPC = [
  'admin.post.stats',
  'admin.post.pending',
  'admin.post.reported',
  'admin.post.approve',
  'admin.post.reject',
  'admin.report.list',
  'admin.report.review',
  'admin.dashboard.analytics',
  'auth.admin.dashboard_stats',
  'auth.admin.list_users',
  'auth.admin.list_admins',
  'auth.admin.create_admin_user',
  'auth.admin.block_user',
  'auth.admin.unblock_user',
  'auth.admin.reset_violation_penalty',
  'auth.get_ai_moderation_config',
  'auth.admin.update_ai_config',
] as const;

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @Inject('ADMIN_KAFKA_SERVICE') private readonly kafka: ClientKafka,
  ) {}

  onModuleInit() {
    for (const pattern of ADMIN_KAFKA_RPC) {
      this.kafka.subscribeToResponseOf(pattern);
    }
  }

  async getDashboard() {
    const [userStats, postStats, analytics] = await Promise.all([
      firstValueFrom(this.kafka.send('auth.admin.dashboard_stats', {})),
      firstValueFrom(this.kafka.send('admin.post.stats', {})),
      firstValueFrom(this.kafka.send('admin.dashboard.analytics', {})),
    ]);
    return {
      totalUsers: userStats.totalUsers ?? 0,
      blockedUsers: userStats.blockedUsers ?? 0,
      usersOverTime: userStats.usersOverTime ?? [],
      totalPosts: postStats.totalPosts ?? 0,
      pendingPosts: postStats.pendingPosts ?? 0,
      reportedPosts: postStats.reportedPosts ?? 0,
      postsOverTime: analytics.postsOverTime ?? [],
      reportsOverTime: analytics.reportsOverTime ?? [],
      recentActivity: analytics.recentActivity ?? [],
    };
  }

  getUsers(limit?: number, skip?: number) {
    return this.kafka.send('auth.admin.list_users', { limit, skip });
  }

  getAdmins() {
    return this.kafka.send('auth.admin.list_admins', {});
  }

  createAdminUser(email: string, password: string) {
    return this.kafka.send('auth.admin.create_admin_user', { email, password });
  }

  blockUser(userId: string, blockedUntil?: string, blockDays?: number) {
    return this.kafka.send('auth.admin.block_user', {
      userId,
      blockedUntil,
      blockDays,
    });
  }

  unblockUser(userId: string) {
    return this.kafka.send('auth.admin.unblock_user', { userId });
  }

  resetViolationPenalty(userId: string) {
    return this.kafka.send('auth.admin.reset_violation_penalty', { userId });
  }

  getAiConfig() {
    return this.kafka.send('auth.get_ai_moderation_config', {});
  }

  updateAiConfig(body: {
    enabled?: boolean;
    temperature?: number;
    categoryThresholds?: Record<string, number>;
  }) {
    return this.kafka.send('auth.admin.update_ai_config', body);
  }

  getPendingPosts(limit?: number, skip?: number) {
    return this.kafka.send('admin.post.pending', { limit, skip });
  }

  getReportedPosts(limit?: number, skip?: number) {
    return this.kafka.send('admin.post.reported', { limit, skip });
  }

  approvePost(postId: string) {
    return this.kafka.send('admin.post.approve', { postId });
  }

  rejectPost(postId: string) {
    return this.kafka.send('admin.post.reject', { postId });
  }

  getReports(limit?: number, skip?: number, status?: string) {
    return this.kafka.send('admin.report.list', { limit, skip, status });
  }

  reviewReport(id: string, reviewerId: string, action: 'uphold' | 'dismiss') {
    return this.kafka.send('admin.report.review', { id, reviewerId, action });
  }
}
