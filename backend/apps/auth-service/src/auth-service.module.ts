import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
      ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/auth-service/.env',
    }),

    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '3h' },
    }),

    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE', transport: Transport.KAFKA, 
        options: {
          client: { brokers: ['localhost:9092'] },
        },
      },
    ]),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService, PrismaService],
})
export class AuthServiceModule {}
