import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { kafkaBrokersFromEnv } from './kafka-brokers';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'ai-service-producer',
            brokers: kafkaBrokersFromEnv(),
            connectionTimeout: 30_000,
            retry: {
              initialRetryTime: 300,
              retries: 15,
              maxRetryTime: 30_000,
            },
          },
          consumer: {
            groupId: 'ai-service-config-reply',
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaClientModule {}
