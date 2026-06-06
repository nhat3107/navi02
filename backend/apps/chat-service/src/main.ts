import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import dns from 'node:dns';

// Public DNS breaks in-cluster names (e.g. broker.navi.svc.cluster.local). Opt in for local Atlas SRV only.
if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

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
        connectionTimeout: 30_000,
        retry: {
          initialRetryTime: 300,
          retries: 15,
          maxRetryTime: 30_000,
        },
      },
      consumer: {
        groupId: 'chat-consumer',
        sessionTimeout: 30_000,
        rebalanceTimeout: 60_000,
      },
    },
  });

  for (let attempt = 1; ; attempt++) {
    try {
      await app.startAllMicroservices();
      break;
    } catch (err) {
      console.error(`chat-service Kafka start attempt ${attempt} failed:`, err);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  const httpPort = Number(process.env.CHAT_HTTP_PORT ?? 4030);
  await app.listen(httpPort, '0.0.0.0');
  console.log(`Chat service listening on 0.0.0.0:${httpPort}`);
}
bootstrap().catch((err) => {
  console.error('chat-service bootstrap failed:', err);
  process.exit(1);
});
