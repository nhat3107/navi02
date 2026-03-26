import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA, 
        options: {
          client: { 
            brokers: ['localhost:9092'] 
          }, 
        }
      }
    ]),

    ClientsModule.register([
      {
        name: 'TCP_SERVICE', transport: Transport.TCP, 
        options: {
          port: 4001,
        }
      }
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
