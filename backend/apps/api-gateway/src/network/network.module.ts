import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-network',
            brokers: ['localhost:9092'],
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
