import { NestFactory } from '@nestjs/core';
import { NetworkServiceModule } from './network-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dns from 'node:dns';
import { kafkaBrokersFromEnv } from './kafka-brokers';

if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(NetworkServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'network',
        brokers: kafkaBrokersFromEnv(),
        connectionTimeout: 30_000,
        retry: {
          initialRetryTime: 300,
          retries: 15,
          maxRetryTime: 30_000,
        },
      },
      consumer: {
        groupId: 'network-consumer',
        sessionTimeout: 30_000,
        rebalanceTimeout: 60_000,
      },
    },
  });
  await app.listen();
}
bootstrap().catch((err) => {
  console.error('network-service bootstrap failed:', err);
  process.exit(1);
});
