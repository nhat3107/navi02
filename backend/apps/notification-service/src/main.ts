import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dns from 'node:dns';
import { kafkaBrokersFromEnv } from './kafka-env';

if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

function logStartupEnv(): void {
  console.log(
    `notification-service KAFKA_BROKERS=${process.env.KAFKA_BROKERS ?? '(unset)'}`,
  );
  console.log(
    `notification-service DATABASE_URL set=${Boolean(process.env.DATABASE_URL?.trim())}`,
  );
  if (process.env.USE_PUBLIC_DNS === 'true') {
    console.warn(
      'notification-service USE_PUBLIC_DNS=true — broker hostname may not resolve',
    );
  }
}

function kafkaMicroserviceOptions(): MicroserviceOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification',
        brokers: kafkaBrokersFromEnv(),
        connectionTimeout: 30_000,
        retry: {
          initialRetryTime: 300,
          retries: 15,
          maxRetryTime: 30_000,
        },
      },
      consumer: {
        groupId: 'notification-consumer',
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
      app = await NestFactory.createMicroservice<MicroserviceOptions>(
        NotificationServiceModule,
        kafkaMicroserviceOptions(),
      );
      await app.listen();
      console.log('notification-service listening (Kafka)');
      return;
    } catch (err) {
      console.error(
        `notification-service bootstrap attempt ${attempt} failed:`,
        err,
      );
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
  console.error('notification-service bootstrap failed:', err);
  process.exit(1);
});
