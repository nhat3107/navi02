import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationReferenceType,
} from './schemas/notification.schema';
import { NotificationRealtimeOutboundService } from './notification-realtime-outbound.service';

function serializeForRealtime(doc: NotificationDocument): Record<string, unknown> {
  const created = (doc as any).createdAt as Date | undefined;
  return {
    id: String(doc._id),
    recipientId: doc.recipientId,
    senderId: doc.senderId,
    type: doc.type,
    referenceId: doc.referenceId,
    referenceType: doc.referenceType,
    preview: doc.preview ?? null,
    isRead: doc.isRead,
    createdAt:
      created instanceof Date
        ? created.toISOString()
        : new Date().toISOString(),
  };
}

@Injectable()
export class NotificationServiceService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly realtimeOutbound: NotificationRealtimeOutboundService,
  ) {}

  async create(data: {
    recipientId: string;
    senderId: string;
    type: NotificationType;
    referenceId: string;
    referenceType: NotificationReferenceType;
    preview?: string | null;
  }): Promise<void> {
    try {
      // Don't notify yourself (likes, comments, follows — not author system notices).
      if (data.recipientId === data.senderId) return;

      const doc = await new this.notificationModel(data).save();
      await this.realtimeOutbound.publish(serializeForRealtime(doc));
    } catch (error) {
      console.error('Error creating notification', error);
    }
  }

  /** Moderation / lifecycle notices where recipient is the post author. */
  async createAuthorNotice(data: {
    recipientId: string;
    type:
      | NotificationType.POST_PENDING
      | NotificationType.POST_APPROVED
      | NotificationType.POST_DELETED
      | NotificationType.REPORT_REVIEWED;
    referenceId: string;
    referenceType?: NotificationReferenceType;
    preview?: string | null;
  }): Promise<void> {
    try {
      const doc = await new this.notificationModel({
        recipientId: data.recipientId,
        senderId: data.recipientId,
        type: data.type,
        referenceId: data.referenceId,
        referenceType: data.referenceType ?? NotificationReferenceType.POST,
        preview: data.preview ?? null,
      }).save();
      await this.realtimeOutbound.publish(serializeForRealtime(doc));
    } catch (error) {
      console.error('Error creating author notification', error);
    }
  }

  async getByRecipient(recipientId: string, limit = 20, skip = 0): Promise<any> {
    try {
      const notifications = await this.notificationModel
        .find({ recipientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
      return { data: notifications };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting notifications', error);
      throw new RpcException({ status: 500, message: 'Failed to get notifications' });
    }
  }

  async getUnreadCount(recipientId: string): Promise<any> {
    try {
      const count = await this.notificationModel
        .countDocuments({ recipientId, isRead: false })
        .exec();
      return { data: { count } };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting unread count', error);
      throw new RpcException({ status: 500, message: 'Failed to get unread count' });
    }
  }

  async markAsRead(recipientId: string, notificationId: string): Promise<any> {
    try {
      const updated = await this.notificationModel
        .findOneAndUpdate(
          { _id: notificationId, recipientId },
          { isRead: true },
          { returnDocument: 'after' },
        )
        .exec();
      if (!updated) {
        throw new RpcException({ status: 404, message: 'Notification not found' });
      }
      return { message: 'Notification marked as read' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).name === 'CastError') {
        throw new RpcException({ status: 404, message: 'Notification not found' });
      }
      console.error('Error marking notification as read', error);
      throw new RpcException({ status: 500, message: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(recipientId: string): Promise<any> {
    try {
      await this.notificationModel
        .updateMany({ recipientId, isRead: false }, { isRead: true })
        .exec();
      return { message: 'All notifications marked as read' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error marking all notifications as read', error);
      throw new RpcException({ status: 500, message: 'Failed to mark all as read' });
    }
  }

  async deleteById(recipientId: string, notificationId: string): Promise<any> {
    try {
      const deleted = await this.notificationModel
        .findOneAndDelete({ _id: notificationId, recipientId })
        .exec();
      if (!deleted) {
        throw new RpcException({ status: 404, message: 'Notification not found' });
      }
      return { message: 'Notification deleted' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as { name?: string }).name === 'CastError') {
        throw new RpcException({ status: 404, message: 'Notification not found' });
      }
      console.error('Error deleting notification', error);
      throw new RpcException({ status: 500, message: 'Failed to delete notification' });
    }
  }
}
