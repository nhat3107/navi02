import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import {
  kafkaBrokersFromEnv,
  NOTIFICATION_REALTIME_TOPIC,
} from './kafka-env';

@Injectable()
export class NotificationRealtimeOutboundService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(NotificationRealtimeOutboundService.name);
  private producer: Producer | null = null;

  onModuleInit(): void {
    void this.connectInBackground();
  }

  private async connectInBackground(): Promise<void> {
    const kafka = new Kafka({
      clientId: 'notification-service-realtime',
      brokers: kafkaBrokersFromEnv(),
      connectionTimeout: 30_000,
      retry: {
        initialRetryTime: 300,
        retries: 15,
        maxRetryTime: 30_000,
      },
    });
    this.producer = kafka.producer();
    for (let attempt = 1; ; attempt++) {
      try {
        await this.producer.connect();
        this.log.log('Kafka realtime producer connected');
        return;
      } catch (err) {
        this.log.warn(
          `Kafka producer connect attempt ${attempt} failed: ${String(err)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
  }

  async publish(row: Record<string, unknown>): Promise<void> {
    if (!this.producer) return;
    try {
      await this.producer.send({
        topic: NOTIFICATION_REALTIME_TOPIC,
        messages: [{ value: JSON.stringify(row) }],
      });
    } catch (e) {
      this.log.warn(`Failed to publish realtime notification: ${String(e)}`);
    }
  }
}
