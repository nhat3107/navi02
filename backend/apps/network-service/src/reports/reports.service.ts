import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import {
  Report,
  ReportDocument,
  ReportStatus,
  ReportTargetType,
} from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  async create(data: {reporterId: string;targetId: string;targetType: ReportTargetType;description: string}): Promise<any> {
    try {
      const created = new this.reportModel(data);
      const saved = await created.save();
      return { message: 'Report submitted successfully', data: saved };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error creating report', error);
      throw new RpcException({ status: 500, message: 'Failed to create report' });
    }
  }

  async findById(id: string): Promise<any> {
    try {
      const report = await this.reportModel.findById(id).exec();
      if (!report) {
        throw new RpcException({ status: 404, message: `Report ${id} not found` });
      }
      return { data: report };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).name === 'CastError') {
        throw new RpcException({ status: 404, message: `Report ${id} not found` });
      }
      console.error('Error finding report by id', error);
      throw new RpcException({ status: 500, message: 'Failed to find report' });
    }
  }

  async findByStatus(status: ReportStatus, limit = 20, skip = 0): Promise<any> {
    try {
      const reports = await this.reportModel
        .find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return { data: reports };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error finding reports by status', error);
      throw new RpcException({ status: 500, message: 'Failed to find reports' });
    }
  }

  async findByTarget(targetType: ReportTargetType, targetId: string): Promise<any> {
    try {
      const reports = await this.reportModel
        .find({ targetType, targetId })
        .sort({ createdAt: -1 })
        .exec();
      return { data: reports };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error finding reports by target', error);
      throw new RpcException({ status: 500, message: 'Failed to find reports' });
    }
  }

  async review(data: {id: string;reviewerId: string;status: ReportStatus}): Promise<any> {
    try {
      const updated = await this.reportModel
        .findByIdAndUpdate(
          data.id,
          {
            status: data.status,
            reviewedBy: data.reviewerId,
            reviewedAt: new Date(),
          },
          { returnDocument: 'after' },
        )
        .exec();
      if (!updated) {
        throw new RpcException({ status: 404, message: `Report ${data.id} not found` });
      }
      return { message: 'Report reviewed successfully', data: updated };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error reviewing report', error);
      throw new RpcException({ status: 500, message: 'Failed to review report' });
    }
  }
}
