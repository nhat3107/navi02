import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(ChatServiceModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'chat-service',
        brokers: kafkaBrokers(),
      },
      consumer: {
        groupId: 'chat-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  const httpPort = Number(process.env.CHAT_HTTP_PORT ?? 4030);
  await app.listen(httpPort);
}
bootstrap();
