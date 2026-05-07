import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(UserServiceModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'user-service',
        brokers: kafkaBrokers(),
      },
      consumer: {
        groupId: 'user-consumer',
      },
    },
  });
  await app.listen();
}
bootstrap();
