import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import {
  Report,
  ReportDocument,
  ReportStatus,
  ReportTargetType,
} from '../reports/schemas/report.schema';
import { AdminPostsService } from './admin-posts.service';

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly adminPostsService: AdminPostsService,
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
    return { data: reports };
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
