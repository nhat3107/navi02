import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import {
  kafkaBrokersFromEnv,
  NOTIFICATION_REALTIME_TOPIC,
} from './kafka-env';

/** Lazy Kafka producer — never connects at startup (avoids DNS/crash on boot). */
@Injectable()
export class NotificationRealtimeOutboundService implements OnModuleDestroy {
  private readonly log = new Logger(NotificationRealtimeOutboundService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private connected = false;
  private connecting: Promise<void> | null = null;

  private getKafka(): Kafka {
    if (!this.kafka) {
      this.kafka = new Kafka({
        clientId: 'notification-service-realtime',
        brokers: kafkaBrokersFromEnv(),
        connectionTimeout: 10_000,
        // Fail fast; ensureConnected() retries with backoff.
        retry: { retries: 0 },
      });
    }
    return this.kafka;
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.connected && this.producer) return true;
    if (this.connecting) {
      try {
        await this.connecting;
        return this.connected;
      } catch {
        return false;
      }
    }

    this.connecting = this.connectWithRetry();
    try {
      await this.connecting;
      return this.connected;
    } catch {
      return false;
    } finally {
      this.connecting = null;
    }
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= 30; attempt++) {
      try {
        if (!this.producer) {
          this.producer = this.getKafka().producer();
        }
        await this.producer.connect();
        this.connected = true;
        this.log.log('Kafka realtime producer connected');
        return;
      } catch (err) {
        this.connected = false;
        this.log.warn(
          `Kafka producer connect attempt ${attempt}/30 failed: ${String(err)}`,
        );
        if (attempt === 30) return;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      try {
        await this.producer.disconnect();
      } catch {
        /* ignore */
      }
      this.producer = null;
      this.connected = false;
    }
  }

  async publish(row: Record<string, unknown>): Promise<void> {
    if (!(await this.ensureConnected()) || !this.producer) return;
    try {
      await this.producer.send({
        topic: NOTIFICATION_REALTIME_TOPIC,
        messages: [{ value: JSON.stringify(row) }],
      });
    } catch (e) {
      this.connected = false;
      this.log.warn(`Failed to publish realtime notification: ${String(e)}`);
    }
  }
}
