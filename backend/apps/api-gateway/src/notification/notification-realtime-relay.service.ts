import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, type Consumer } from 'kafkajs';
import { NotificationsGateway } from './notifications.gateway';

export const NOTIFICATION_REALTIME_TOPIC =
  'notification.realtime.delivered' as const;

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

@Injectable()
export class NotificationRealtimeRelayService implements OnModuleDestroy {
  private readonly log = new Logger(NotificationRealtimeRelayService.name);
  private consumer: Consumer | null = null;
  private started = false;

  async start(gateway: NotificationsGateway): Promise<void> {
    if (this.started) return;
    this.started = true;
    const kafka = new Kafka({
      clientId: 'api-gateway-notification-relay',
      brokers: kafkaBrokers(),
      connectionTimeout: 30_000,
      retry: {
        initialRetryTime: 300,
        retries: 15,
        maxRetryTime: 30_000,
      },
    });
    this.consumer = kafka.consumer({
      groupId: 'api-gateway-notification-realtime-relay',
    });

    for (let attempt = 1; ; attempt++) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: NOTIFICATION_REALTIME_TOPIC,
          fromBeginning: false,
        });
        void this.consumer.run({
          eachMessage: async ({ message }) => {
            const raw = message.value?.toString();
            if (!raw) return;
            try {
              const row = JSON.parse(raw) as { recipientId?: string };
              if (typeof row.recipientId !== 'string' || !row.recipientId) return;
              gateway.emitToUser(row.recipientId, 'notification:new', row);
            } catch {
              /* ignore malformed payloads */
            }
          },
        });
        this.log.log('Notification realtime relay connected');
        return;
      } catch (err) {
        this.log.warn(
          `Notification relay connect attempt ${attempt} failed: ${String(err)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
    }
  }
}
