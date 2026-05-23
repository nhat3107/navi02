import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Like, LikeSchema } from './schemas/like.schema';
import { CommentLike, CommentLikeSchema } from './schemas/comment-like.schema';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../comments/comments.module';
import { KafkaClientModule } from '../kafka-client.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Like.name, schema: LikeSchema },
      { name: CommentLike.name, schema: CommentLikeSchema },
    ]),
    PostsModule,
    CommentsModule,
    KafkaClientModule,
  ],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
