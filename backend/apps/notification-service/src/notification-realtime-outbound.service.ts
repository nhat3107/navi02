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

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: 'notification-service-realtime',
      brokers: kafkaBrokersFromEnv(),
    });
    this.producer = kafka.producer();
    await this.producer.connect();
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
