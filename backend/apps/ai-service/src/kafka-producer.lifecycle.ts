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
    for (let attempt = 1; attempt <= 30; attempt++) {
      try {
        await this.kafka.connect();
        return;
      } catch (err) {
        if (attempt === 30) throw err;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafka.close();
  }
}
