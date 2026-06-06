import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

/** Request–reply patterns network-service sends to other microservices. */
const NETWORK_KAFKA_RPC_REPLY = [
  'ai.moderate_content',
  'auth.check_posting_allowed',
  'auth.apply_violation_penalty',
] as const;

@Injectable()
export class KafkaProducerLifecycle implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(KafkaProducerLifecycle.name);
  private connected = false;

  constructor(@Inject('KAFKA_SERVICE') private readonly kafka: ClientKafka) {}

  onModuleInit(): void {
    for (const pattern of NETWORK_KAFKA_RPC_REPLY) {
      this.kafka.subscribeToResponseOf(pattern);
    }
    void this.connectInBackground();
  }

  private async connectInBackground(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.kafka.connect();
        this.connected = true;
        this.log.log('Kafka producer connected');
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
    if (!this.connected) return;
    await this.kafka.close();
  }
}
