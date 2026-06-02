import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import {
  Report,
  ReportDocument,
  ReportStatus,
  ReportTargetType,
} from '../reports/schemas/report.schema';
import { AdminPostsService } from './admin-posts.service';
import { AdminProfilesService } from './admin-profiles.service';

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly adminPostsService: AdminPostsService,
    private readonly adminProfilesService: AdminProfilesService,
  ) {}

  async findAll(limit = 20, skip = 0, status?: ReportStatus): Promise<any> {
    const filter = status ? { status } : {};
    const reports = await this.reportModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const postIds = [
      ...new Set(
        reports
          .filter((r) => r.targetType === ReportTargetType.POST)
          .map((r) => String(r.targetId)),
      ),
    ];

    const posts =
      postIds.length > 0
        ? await this.postModel
            .find({ _id: { $in: postIds } })
            .lean()
            .exec()
        : [];

    const postMap = new Map(posts.map((p) => [String(p._id), p]));

    const userIds = new Set<string>();
    for (const report of reports) {
      if (report.reporterId) userIds.add(String(report.reporterId));
      const post =
        report.targetType === ReportTargetType.POST
          ? postMap.get(String(report.targetId))
          : null;
      if (post?.authorId) userIds.add(String(post.authorId));
    }
    const profiles = await this.adminProfilesService.lookup([...userIds]);

    return {
      data: reports.map((report) => {
        const reporterProfile = profiles.get(String(report.reporterId));
        const rawPost =
          report.targetType === ReportTargetType.POST
            ? postMap.get(String(report.targetId)) ?? null
            : null;
        const authorProfile = rawPost
          ? profiles.get(String(rawPost.authorId))
          : null;
        const targetPost = rawPost
          ? {
              ...rawPost,
              authorUsername: authorProfile?.username ?? null,
            }
          : null;

        return {
          ...report,
          reporterUsername: reporterProfile?.username ?? null,
          targetPost,
        };
      }),
    };
  }

  async reviewReport(data: {
    id: string;
    reviewerId: string;
    action: 'uphold' | 'dismiss';
  }): Promise<any> {
    const report = await this.reportModel.findById(data.id).exec();
    if (!report) {
      throw new RpcException({
        status: 404,
        message: `Report ${data.id} not found`,
      });
    }
    if (report.status !== ReportStatus.PENDING) {
      throw new RpcException({
        status: 409,
        message: 'Report was already reviewed',
      });
    }

    if (data.action === 'uphold') {
      if (report.targetType === ReportTargetType.POST) {
        await this.adminPostsService.rejectPost(report.targetId, true);
      }
      report.status = ReportStatus.RESOLVED;
    } else {
      report.status = ReportStatus.REJECTED;
    }

    report.reviewedBy = data.reviewerId;
    report.reviewedAt = new Date();
    await report.save();

    this.kafkaClient.emit('notification.report_reviewed', {
      recipientId: report.reporterId,
      reportId: String(report._id),
      upheld: data.action === 'uphold',
    });

    return { message: 'Report reviewed', data: report };
  }
}
