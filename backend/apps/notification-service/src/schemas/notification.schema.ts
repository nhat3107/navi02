import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  LIKE_POST = 'like_post',
  LIKE_COMMENT = 'like_comment',
  COMMENT = 'comment',
  REPLY = 'reply',
  NEW_POST = 'new_post',
  POST_PENDING = 'post_pending',
  POST_APPROVED = 'post_approved',
  POST_DELETED = 'post_deleted',
  FOLLOW = 'follow',
  SHARE_POST = 'share_post',
  REPORT_REVIEWED = 'report_reviewed',
}

export enum NotificationReferenceType {
  POST = 'post',
  COMMENT = 'comment',
  USER = 'user',
  REPORT = 'report',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: String, required: true, index: true })
  recipientId: string;

  @Prop({ type: String, required: true })
  senderId: string;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: String, required: true })
  referenceId: string;

  @Prop({ type: String, enum: NotificationReferenceType, required: true })
  referenceType: NotificationReferenceType;

  @Prop({ type: String, default: null })
  preview: string | null;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Main query: "show me my notifications, newest first"
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
// Unread count
NotificationSchema.index({ recipientId: 1, isRead: 1 });
