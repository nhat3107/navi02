import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './mongoose.service';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { ReportsModule } from './reports/reports.module';
import { LikesModule } from './likes/likes.module';

@Module({
  imports: [
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
  ],
})
export class NetworkServiceModule {}
