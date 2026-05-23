import {
  Inject,
  Injectable,
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
  constructor(@Inject('KAFKA_SERVICE') private readonly kafka: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    for (const pattern of NETWORK_KAFKA_RPC_REPLY) {
      this.kafka.subscribeToResponseOf(pattern);
    }
    await this.kafka.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafka.close();
  }
}
