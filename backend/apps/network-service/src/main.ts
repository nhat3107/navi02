import { NestFactory } from '@nestjs/core';
import { NetworkServiceModule } from './network-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dns from 'node:dns';
import { kafkaBrokersFromEnv } from './kafka-brokers';

dns.setServers(['8.8.8.8', '1.1.1.1']);

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
