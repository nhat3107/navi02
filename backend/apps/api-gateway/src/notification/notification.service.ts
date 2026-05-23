import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

const NOTIFICATION_KAFKA_RPC = [
  'notification.get',
  'notification.unread_count',
  'notification.mark_read',
  'notification.mark_all_read',
  'notification.delete',
] as const;

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
  ) {}

  onModuleInit() {
    for (const pattern of NOTIFICATION_KAFKA_RPC) {
      this.kafkaclient.subscribeToResponseOf(pattern);
    }
  }

  getNotifications(recipientId: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('notification.get', { recipientId, limit, skip });
  }

  getUnreadCount(recipientId: string) {
    return this.kafkaclient.send('notification.unread_count', { recipientId });
  }

  markAsRead(recipientId: string, notificationId: string) {
    return this.kafkaclient.send('notification.mark_read', { recipientId, notificationId });
  }

  markAllAsRead(recipientId: string) {
    return this.kafkaclient.send('notification.mark_all_read', { recipientId });
  }

  deleteNotification(recipientId: string, notificationId: string) {
    return this.kafkaclient.send('notification.delete', {
      recipientId,
      notificationId,
    });
  }
}
