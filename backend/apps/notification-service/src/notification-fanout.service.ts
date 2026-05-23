import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NotificationServiceService } from './notification-service.service';
import {
  NotificationReferenceType,
  NotificationType,
} from './schemas/notification.schema';

const MAX_NEW_POST_FOLLOWER_NOTIFS = 200;

@Injectable()
export class NotificationFanoutService implements OnModuleInit {
  constructor(
    private readonly notifications: NotificationServiceService,
    @Inject('USER_KAFKA_SERVICE') private readonly userKafka: ClientKafka,
  ) {}

  onModuleInit() {
    this.userKafka.subscribeToResponseOf('user.get_followers');
  }

  /**
   * Notifies followers when the author publishes a non-private post.
   */
  async fanoutNewPostToFollowers(payload: {
    senderId: string;
    postId: string;
    preview?: string | null;
    visibility?: string;
  }): Promise<void> {
    const vis = (payload.visibility ?? 'public').trim().toLowerCase();
    if (vis === 'private' || vis === 'pending') return;

    type FollowersRpc = { data?: Array<{ id?: string }> };
    let list: Array<{ id?: string }> = [];
    try {
      const res = (await firstValueFrom(
        this.userKafka.send('user.get_followers', { userId: payload.senderId }),
      )) as FollowersRpc;
      list = Array.isArray(res?.data) ? res.data : [];
    } catch {
      return;
    }

    const capped = list.slice(0, MAX_NEW_POST_FOLLOWER_NOTIFS);
    await Promise.all(
      capped.map(async (f) => {
        const rid = f?.id;
        if (typeof rid !== 'string' || !rid) return;
        await this.notifications.create({
          recipientId: rid,
          senderId: payload.senderId,
          type: NotificationType.NEW_POST,
          referenceId: payload.postId,
          referenceType: NotificationReferenceType.POST,
          preview: payload.preview ?? null,
        });
      }),
    );
  }
}
