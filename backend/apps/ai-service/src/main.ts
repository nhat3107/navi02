import './load-env';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dns from 'node:dns';
import { Logger } from '@nestjs/common';
import { AiServiceModule } from './ai-service.module';
import { kafkaBrokersFromEnv } from './kafka-brokers';

if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

async function bootstrap() {
  const logger = new Logger('AiService');
  const brokers = kafkaBrokersFromEnv();
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  logger.log(`Kafka brokers: ${brokers.join(', ')}`);
  logger.log(`OpenAI key: ${hasKey ? 'loaded' : 'MISSING'}`);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AiServiceModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'ai-service',
          brokers,
          connectionTimeout: 30_000,
          retry: {
            initialRetryTime: 300,
            retries: 15,
            maxRetryTime: 30_000,
          },
        },
        consumer: {
          groupId: 'ai-service-consumer',
          sessionTimeout: 30_000,
          rebalanceTimeout: 60_000,
        },
      },
    },
  );
  await app.listen();
  logger.log('Listening (Kafka RPC: ai.moderate_content)');
}
bootstrap().catch((err) => {
  console.error('ai-service bootstrap failed:', err);
  process.exit(1);
});
