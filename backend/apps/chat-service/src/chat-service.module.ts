import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatServiceController } from './chat-service.controller';
import { ChatServiceService } from './chat-service.service';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';

function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: 'apps/chat-service/.env',
    }),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.DATABASE_URL?.trim();
        if (!uri) {
          throw new Error('DATABASE_URL must be set in apps/chat-service/.env');
        }
        return { uri };
      },
    }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'chat-service-kafka',
            brokers: kafkaBrokers(),
          },
        },
      },
      {
        name: 'USER_KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'chat-service-user',
            brokers: kafkaBrokers(),
          },
          consumer: {
            groupId: 'chat-service-user-reply',
          },
        },
      },
    ]),
  ],
  controllers: [ChatServiceController],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
