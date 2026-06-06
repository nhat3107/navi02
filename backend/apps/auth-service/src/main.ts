import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'auth',
        brokers: kafkaBrokers(),
        connectionTimeout: 30_000,
        retry: {
          initialRetryTime: 300,
          retries: 15,
          maxRetryTime: 30_000,
        },
      },
      consumer: {
        groupId: 'auth-consumer',
        sessionTimeout: 30_000,
        rebalanceTimeout: 60_000,
      },
    },
  });
  await app.listen();
}
bootstrap().catch((err) => {
  console.error('auth-service bootstrap failed:', err);
  process.exit(1);
});
