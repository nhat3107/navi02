import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './schemas/post.schema';
import { Like, LikeSchema } from '../likes/schemas/like.schema';
import { Share, ShareSchema } from './schemas/share.schema';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { KafkaClientModule } from '../kafka-client.module';

@Module({
  imports: [
    KafkaClientModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Share.name, schema: ShareSchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
