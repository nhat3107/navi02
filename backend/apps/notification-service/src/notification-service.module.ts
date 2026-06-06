import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseConfigService } from './mongoose.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationRealtimeOutboundService } from './notification-realtime-outbound.service';
import { NotificationFanoutService } from './notification-fanout.service';
import { kafkaBrokersFromEnv } from './kafka-env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: 'apps/notification-service/.env',
    }),
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    ClientsModule.register([
      {
        name: 'USER_KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'notification-service-user-rpc',
            brokers: kafkaBrokersFromEnv(),
            connectionTimeout: 30_000,
            retry: {
              initialRetryTime: 300,
              retries: 15,
              maxRetryTime: 30_000,
            },
          },
          consumer: {
            groupId: 'notification-service-user-reply',
          },
        },
      },
    ]),
  ],
  controllers: [NotificationServiceController],
  providers: [
    NotificationRealtimeOutboundService,
    NotificationFanoutService,
    NotificationServiceService,
  ],
})
export class NotificationServiceModule {}
