import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRealtimeRelayService } from './notification-realtime-relay.service';

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
            clientId: 'api-gateway-notification',
            brokers: kafkaBrokers(),
          },
          consumer: {
            groupId: 'api-gateway-notification-reply',
          },
        },
      },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationsGateway,
    NotificationRealtimeRelayService,
  ],
})
export class NotificationModule {}
