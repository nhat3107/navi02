import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { kafkaBrokersFromEnv } from './kafka-env';

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
