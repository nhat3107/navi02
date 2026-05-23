import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

/** ClientKafka must connect before `emit` delivers messages. */
@Injectable()
export class KafkaProducerLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject('KAFKA_SERVICE') private readonly kafka: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    await this.kafka.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafka.close();
  }
}
