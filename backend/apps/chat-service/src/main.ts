import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import dns from 'node:dns';

// Public DNS breaks in-cluster names (e.g. broker). Opt in for local Atlas SRV only.
if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function logStartupEnv(): void {
  console.log(`chat-service KAFKA_BROKERS=${process.env.KAFKA_BROKERS ?? '(unset)'}`);
  console.log(
    `chat-service DATABASE_URL set=${Boolean(process.env.DATABASE_URL?.trim())}`,
  );
  if (process.env.USE_PUBLIC_DNS === 'true') {
    console.warn(
      'chat-service USE_PUBLIC_DNS=true — broker hostname may not resolve',
    );
  }
}

function kafkaMicroserviceOptions(): MicroserviceOptions {
  return {
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
  };
}

async function bootstrap(): Promise<void> {
  logStartupEnv();

  for (let attempt = 1; ; attempt++) {
    let app;
    try {
      app = await NestFactory.create(ChatServiceModule);
      app.connectMicroservice(kafkaMicroserviceOptions());
      await app.startAllMicroservices();
      const httpPort = Number(process.env.CHAT_HTTP_PORT ?? 4030);
      await app.listen(httpPort, '0.0.0.0');
      console.log(`chat-service listening on 0.0.0.0:${httpPort}`);
      return;
    } catch (err) {
      console.error(`chat-service bootstrap attempt ${attempt} failed:`, err);
      if (app) {
        try {
          await app.close();
        } catch {
          /* ignore close errors between retries */
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

bootstrap().catch((err) => {
  console.error('chat-service bootstrap failed:', err);
  process.exit(1);
});
