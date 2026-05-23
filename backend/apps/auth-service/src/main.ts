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
      },
      consumer: {
        groupId: 'auth-consumer',
      },
    }
  });
  await app.listen();
}
bootstrap();
