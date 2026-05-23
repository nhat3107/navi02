import { Controller } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { AdminPostsService } from './admin-posts.service';
import { AdminReportsService } from './admin-reports.service';
import { ReportStatus } from '../reports/schemas/report.schema';

@Controller()
export class AdminController {
  constructor(
    private readonly adminPostsService: AdminPostsService,
    private readonly adminReportsService: AdminReportsService,
  ) {}

  @MessagePattern('admin.post.stats', Transport.KAFKA)
  postStats(): Promise<any> {
    return this.adminPostsService.getPostStats();
  }

  @MessagePattern('admin.post.pending', Transport.KAFKA)
  pendingPosts(data: { limit?: number; skip?: number }): Promise<any> {
    return this.adminPostsService.findPending(data.limit, data.skip);
  }

  @MessagePattern('admin.post.reported', Transport.KAFKA)
  reportedPosts(data: { limit?: number; skip?: number }): Promise<any> {
    return this.adminPostsService.findReported(data.limit, data.skip);
  }

  @MessagePattern('admin.post.approve', Transport.KAFKA)
  approvePost(data: { postId: string }): Promise<any> {
    return this.adminPostsService.approvePost(data.postId);
  }

  @MessagePattern('admin.post.reject', Transport.KAFKA)
  rejectPost(data: { postId: string; applyPenalty?: boolean }): Promise<any> {
    return this.adminPostsService.rejectPost(
      data.postId,
      data.applyPenalty !== false,
    );
  }

  @MessagePattern('admin.dashboard.analytics', Transport.KAFKA)
  dashboardAnalytics(): Promise<any> {
    return this.adminPostsService.getDashboardAnalytics();
  }

  @MessagePattern('admin.report.list', Transport.KAFKA)
  listReports(data: {
    limit?: number;
    skip?: number;
    status?: ReportStatus;
  }): Promise<any> {
    return this.adminReportsService.findAll(
      data.limit,
      data.skip,
      data.status,
    );
  }

  @MessagePattern('admin.report.review', Transport.KAFKA)
  reviewReport(data: {
    id: string;
    reviewerId: string;
    action: 'uphold' | 'dismiss';
  }): Promise<any> {
    return this.adminReportsService.reviewReport(data);
  }
}
