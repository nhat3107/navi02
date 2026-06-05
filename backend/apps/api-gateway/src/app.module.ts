import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { CallModule } from './call/call.module';
import { ChatModule } from './chat/chat.module';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { NetworkModule } from './network/network.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: 'apps/api-gateway/.env',
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
    }),
    AuthModule,
    UserModule,
    NetworkModule,
    NotificationModule,
    CallModule,
    ChatModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
