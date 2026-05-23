import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Transport } from '@nestjs/microservices';
import { NotificationFanoutService } from './notification-fanout.service';
import { NotificationServiceService } from './notification-service.service';
import { NotificationReferenceType, NotificationType } from './schemas/notification.schema';

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly notificationService: NotificationServiceService,
    private readonly fanout: NotificationFanoutService,
  ) {}

  // --- Event consumers (fire-and-forget from other services) ---

  @EventPattern('notification.like_post', Transport.KAFKA)
  async onLikePost(data: { senderId: string; recipientId: string; postId: string }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: NotificationType.LIKE_POST,
      referenceId: data.postId,
      referenceType: NotificationReferenceType.POST,
    });
  }

  @EventPattern('notification.like_comment', Transport.KAFKA)
  async onLikeComment(data: { senderId: string; recipientId: string; commentId: string }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: NotificationType.LIKE_COMMENT,
      referenceId: data.commentId,
      referenceType: NotificationReferenceType.COMMENT,
    });
  }

  @EventPattern('notification.comment', Transport.KAFKA)
  async onComment(data: { senderId: string; recipientId: string; postId: string; preview?: string }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: NotificationType.COMMENT,
      referenceId: data.postId,
      referenceType: NotificationReferenceType.POST,
      preview: data.preview || null,
    });
  }

  @EventPattern('notification.reply', Transport.KAFKA)
  async onReply(data: { senderId: string; recipientId: string; commentId: string; preview?: string }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: NotificationType.REPLY,
      referenceId: data.commentId,
      referenceType: NotificationReferenceType.COMMENT,
      preview: data.preview || null,
    });
  }

  @EventPattern('notification.follow', Transport.KAFKA)
  async onFollow(data: { senderId: string; recipientId: string }) {
    await this.notificationService.create({
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: NotificationType.FOLLOW,
      referenceId: data.senderId,
      referenceType: NotificationReferenceType.USER,
    });
  }

  @EventPattern('notification.post_pending', Transport.KAFKA)
  async onPostPending(data: { recipientId: string; postId: string }) {
    await this.notificationService.createAuthorNotice({
      recipientId: data.recipientId,
      type: NotificationType.POST_PENDING,
      referenceId: data.postId,
      preview: 'Your post is under review',
    });
  }

  @EventPattern('notification.post_approved', Transport.KAFKA)
  async onPostApproved(data: { recipientId: string; postId: string }) {
    await this.notificationService.createAuthorNotice({
      recipientId: data.recipientId,
      type: NotificationType.POST_APPROVED,
      referenceId: data.postId,
      preview: 'Your post is now visible',
    });
  }

  @EventPattern('notification.post_deleted', Transport.KAFKA)
  async onPostDeleted(data: { recipientId: string; postId: string }) {
    await this.notificationService.createAuthorNotice({
      recipientId: data.recipientId,
      type: NotificationType.POST_DELETED,
      referenceId: data.postId,
      preview: 'Your post was removed due to policy violation',
    });
  }

  @EventPattern('notification.penalty', Transport.KAFKA)
  async onPenalty(data: { recipientId: string; preview: string }) {
    await this.notificationService.createAuthorNotice({
      recipientId: data.recipientId,
      type: NotificationType.POST_DELETED,
      referenceId: data.recipientId,
      referenceType: NotificationReferenceType.USER,
      preview: data.preview,
    });
  }

  @EventPattern('notification.report_reviewed', Transport.KAFKA)
  async onReportReviewed(data: {
    recipientId: string;
    reportId: string;
    upheld: boolean;
  }) {
    await this.notificationService.createAuthorNotice({
      recipientId: data.recipientId,
      type: NotificationType.REPORT_REVIEWED,
      referenceId: data.reportId,
      referenceType: NotificationReferenceType.REPORT,
      preview: data.upheld
        ? 'Your report was reviewed and action was taken'
        : 'Your report was reviewed and dismissed',
    });
  }

  @EventPattern('notification.new_post', Transport.KAFKA)
  async onNewPost(
    data: {
      senderId: string;
      postId: string;
      preview?: string;
      visibility?: string;
    },
  ) {
    await this.fanout.fanoutNewPostToFollowers({
      senderId: data.senderId,
      postId: data.postId,
      preview: data.preview ?? null,
      visibility: data.visibility,
    });
  }

  // --- RPC handlers (request-reply from api-gateway) ---

  @MessagePattern('notification.get', Transport.KAFKA)
  getNotifications(data: { recipientId: string; limit?: number; skip?: number }) {
    return this.notificationService.getByRecipient(data.recipientId, data.limit, data.skip);
  }

  @MessagePattern('notification.unread_count', Transport.KAFKA)
  getUnreadCount(data: { recipientId: string }) {
    return this.notificationService.getUnreadCount(data.recipientId);
  }

  @MessagePattern('notification.mark_read', Transport.KAFKA)
  markAsRead(data: { recipientId: string; notificationId: string }) {
    return this.notificationService.markAsRead(data.recipientId, data.notificationId);
  }

  @MessagePattern('notification.mark_all_read', Transport.KAFKA)
  markAllAsRead(data: { recipientId: string }) {
    return this.notificationService.markAllAsRead(data.recipientId);
  }

  @MessagePattern('notification.delete', Transport.KAFKA)
  deleteNotification(data: { recipientId: string; notificationId: string }) {
    return this.notificationService.deleteById(
      data.recipientId,
      data.notificationId,
    );
  }
}
