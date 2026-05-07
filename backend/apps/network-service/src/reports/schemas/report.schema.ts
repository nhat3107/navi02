import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

export enum ReportTargetType {
  POST = 'post',
  COMMENT = 'comment',
  USER = 'user',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  // UUID string from auth-service (Postgres). Not a Mongo ObjectId.
  @Prop({ type: String, required: true, index: true })
  reporterId: string;

  // Polymorphic target: a Mongo ObjectId (post/comment) OR a UUID (user),
  // depending on `targetType`. Stored as String to accommodate both.
  @Prop({ type: String, required: true, index: true })
  targetId: string;

  @Prop({
    type: String,
    enum: ReportTargetType,
    required: true,
    index: true,
  })
  targetType: ReportTargetType;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  description: string;

  @Prop({
    type: String,
    enum: ReportStatus,
    default: ReportStatus.PENDING,
    index: true,
  })
  status: ReportStatus;

  // UUID of the moderator (auth-service User.id). Null until reviewed.
  @Prop({ type: String, default: null })
  reviewedBy: string | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Moderation queue: "show me pending reports, newest first".
ReportSchema.index({ status: 1, createdAt: -1 });
// Lookup all reports on a given target.
ReportSchema.index({ targetType: 1, targetId: 1 });
