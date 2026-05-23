import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Post, PostDocument, PostVisibility } from '../posts/schemas/post.schema';
import {
  Report,
  ReportDocument,
  ReportStatus,
  ReportTargetType,
} from '../reports/schemas/report.schema';

const APPLY_PENALTY_RPC = 'auth.apply_violation_penalty';

@Injectable()
export class AdminPostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async getPostStats(): Promise<{
    totalPosts: number;
    pendingPosts: number;
    reportedPosts: number;
  }> {
    const [totalPosts, pendingPosts, reportedPostIds] = await Promise.all([
      this.postModel.countDocuments({
        visibility: { $ne: PostVisibility.DELETED },
      }),
      this.postModel.countDocuments({ visibility: PostVisibility.PENDING }),
      this.reportModel.distinct('targetId', {
        targetType: ReportTargetType.POST,
        status: ReportStatus.PENDING,
      }),
    ]);

    return {
      totalPosts,
      pendingPosts,
      reportedPosts: reportedPostIds.length,
    };
  }

  async findPending(limit = 20, skip = 0): Promise<any> {
    const posts = await this.postModel
      .find({ visibility: PostVisibility.PENDING })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    return { data: posts };
  }

  async findReported(limit = 20, skip = 0): Promise<any> {
    const pendingReports = await this.reportModel
      .find({
        targetType: ReportTargetType.POST,
        status: ReportStatus.PENDING,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const postIds = [
      ...new Set(pendingReports.map((r) => String(r.targetId))),
    ];
    const pageIds = postIds.slice(skip, skip + limit);
    const posts = await this.postModel
      .find({
        _id: { $in: pageIds },
        visibility: { $ne: PostVisibility.DELETED },
      })
      .lean()
      .exec();

    const postMap = new Map(posts.map((p) => [String(p._id), p]));
    const data = pageIds
      .map((id) => {
        const post = postMap.get(id);
        if (!post) return null;
        const reports = pendingReports.filter((r) => r.targetId === id);
        return { post, reports };
      })
      .filter(Boolean);

    return { data };
  }

  async approvePost(postId: string): Promise<any> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new RpcException({ status: 404, message: `Post ${postId} not found` });
    }
    if (post.visibility === PostVisibility.DELETED) {
      throw new RpcException({ status: 410, message: 'Post was already removed' });
    }

    post.visibility = PostVisibility.PUBLIC;
    await post.save();

    this.kafkaClient.emit('notification.post_approved', {
      recipientId: post.authorId,
      postId: String(post._id),
    });

    const text = (post.content ?? '').trim();
    const media = post.mediaUrls ?? [];
    const preview = text
      ? text.length > 100
        ? `${text.substring(0, 100)}...`
        : text
      : media.length > 0
        ? 'Shared a photo'
        : 'New post';

    this.kafkaClient.emit('notification.new_post', {
      senderId: post.authorId,
      postId: String(post._id),
      preview,
      visibility: PostVisibility.PUBLIC,
    });

    return { message: 'Post approved', data: post };
  }

  async rejectPost(postId: string, applyPenalty = true): Promise<any> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new RpcException({ status: 404, message: `Post ${postId} not found` });
    }
    if (post.visibility === PostVisibility.DELETED) {
      throw new RpcException({ status: 410, message: 'Post was already removed' });
    }

    post.visibility = PostVisibility.DELETED;
    await post.save();

    this.kafkaClient.emit('notification.post_deleted', {
      recipientId: post.authorId,
      postId: String(post._id),
    });

    if (applyPenalty) {
      await firstValueFrom(
        this.kafkaClient.send(APPLY_PENALTY_RPC, { userId: post.authorId }),
      );
    }

    await this.reportModel.updateMany(
      {
        targetType: ReportTargetType.POST,
        targetId: String(post._id),
        status: ReportStatus.PENDING,
      },
      { status: ReportStatus.RESOLVED },
    );

    return { message: 'Post removed', data: post };
  }

  async getDashboardAnalytics(): Promise<{
    postsOverTime: { date: string; count: number }[];
    recentActivity: {
      type: string;
      message: string;
      at: string;
      refId: string;
    }[];
  }> {
    const dayCount = 7;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (dayCount - 1));

    const grouped = await this.postModel.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          createdAt: { $gte: start },
          visibility: { $ne: PostVisibility.DELETED },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const countByDate = new Map(grouped.map((g) => [g._id, g.count]));
    const postsOverTime: { date: string; count: number }[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      postsOverTime.push({ date: key, count: countByDate.get(key) ?? 0 });
    }

    const [recentPosts, recentReports] = await Promise.all([
      this.postModel
        .find({ visibility: { $ne: PostVisibility.DELETED } })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .exec(),
      this.reportModel
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .exec(),
    ]);

    const recentActivity = [
      ...recentPosts.map((p) => ({
        type: 'post',
        message:
          p.visibility === PostVisibility.PENDING
            ? 'New post held for review'
            : 'New post created',
        at: new Date(
          (p as { createdAt?: Date }).createdAt ?? Date.now(),
        ).toISOString(),
        refId: String(p._id),
      })),
      ...recentReports.map((r) => ({
        type: 'report',
        message: `Report filed on ${r.targetType}`,
        at: new Date(
          (r as { createdAt?: Date }).createdAt ?? Date.now(),
        ).toISOString(),
        refId: String(r._id),
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10);

    return { postsOverTime, recentActivity };
  }
}
