import { NestFactory } from '@nestjs/core';
import { NetworkServiceModule } from './network-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(NetworkServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'network',
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'network-consumer',
      },
    },
  });
  await app.listen();
}
bootstrap();
