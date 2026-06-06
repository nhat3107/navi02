import { NestFactory } from '@nestjs/core';
import { NetworkServiceModule } from './network-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { kafkaBrokersFromEnv } from './kafka-brokers';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(NetworkServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'network',
        brokers: kafkaBrokersFromEnv(),
      },
      consumer: {
        groupId: 'network-consumer',
      },
    },
  });
  await app.listen();
}
bootstrap();
