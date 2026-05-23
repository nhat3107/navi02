import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserModule } from '../user/user.module';

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-network',
            brokers: kafkaBrokers(),
          },
          consumer: {
            groupId: 'api-gateway-network-reply',
          },
        },
      },
    ]),
    UserModule,
  ],
  controllers: [NetworkController],
  providers: [NetworkService],
})
export class NetworkModule {}
