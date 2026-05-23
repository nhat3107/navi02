import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContentModerationController } from './content-moderation.controller';
import { ContentModerationService } from './content-moderation.service';
import { KafkaClientModule } from './kafka-client.module';
import { KafkaProducerLifecycle } from './kafka-producer.lifecycle';
import { openAiClientProvider } from './openai.provider';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/ai-service/.env', '.env'],
    }),
    KafkaClientModule,
  ],
  controllers: [ContentModerationController],
  providers: [
    openAiClientProvider,
    ContentModerationService,
    KafkaProducerLifecycle,
  ],
})
export class AiServiceModule {}
