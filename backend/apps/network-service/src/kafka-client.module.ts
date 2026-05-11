import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'network-producer',
            brokers: ['localhost:9092'],
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaClientModule {}
