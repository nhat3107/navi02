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
