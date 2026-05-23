import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './mongoose.service';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { ReportsModule } from './reports/reports.module';
import { LikesModule } from './likes/likes.module';
import { AdminModule } from './admin/admin.module';
import { KafkaClientModule } from './kafka-client.module';
import { KafkaProducerLifecycle } from './kafka-producer.lifecycle';

@Module({
  imports: [
    KafkaClientModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/network-service/.env',
    }),

    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),

    PostsModule,
    CommentsModule,
    ReportsModule,
    LikesModule,
    AdminModule,
  ],
  providers: [KafkaProducerLifecycle],
})
export class NetworkServiceModule {}
