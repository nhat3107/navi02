import { Controller } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { ReportsService } from './reports.service';
import { ReportStatus, ReportTargetType } from './schemas/report.schema';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @MessagePattern('report.create', Transport.KAFKA)
  create(data: {reporterId: string;targetId: string;targetType: ReportTargetType;description: string}): Promise<any> {
    return this.reportsService.create(data);
  }

  @MessagePattern('report.find_by_id', Transport.KAFKA)
  findById(data: { id: string }): Promise<any> {
    return this.reportsService.findById(data.id);
  }

  @MessagePattern('report.find_by_status', Transport.KAFKA)
  findByStatus(data: {status: ReportStatus;limit?: number;skip?: number}): Promise<any> {
    return this.reportsService.findByStatus(
      data.status,
      data.limit,
      data.skip,
    );
  }

  @MessagePattern('report.find_by_target', Transport.KAFKA)
  findByTarget(data: {targetType: ReportTargetType;targetId: string}): Promise<any> {
    return this.reportsService.findByTarget(data.targetType, data.targetId);
  }

  @MessagePattern('report.review', Transport.KAFKA)
  review(data: {id: string;reviewerId: string;status: ReportStatus}): Promise<any> {
    return this.reportsService.review(data);
  }
}
