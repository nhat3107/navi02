import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller';
import { UserServiceService } from './user-service.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: 'apps/user-service/.env',
  })],
  controllers: [UserServiceController],
  providers: [UserServiceService, PrismaService],
})
export class UserServiceModule {}
