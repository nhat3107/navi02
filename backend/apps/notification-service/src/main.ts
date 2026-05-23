import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dns from 'node:dns';
import { kafkaBrokersFromEnv } from './kafka-env';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(NotificationServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification',
        brokers: kafkaBrokersFromEnv(),
      },
      consumer: {
        groupId: 'notification-consumer',
      },
    },
  });
  await app.listen();
}
bootstrap();
