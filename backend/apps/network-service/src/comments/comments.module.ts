import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from './schemas/comment.schema';
import {
  CommentLike,
  CommentLikeSchema,
} from '../likes/schemas/comment-like.schema';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostsModule } from '../posts/posts.module';
import { KafkaClientModule } from '../kafka-client.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: CommentLike.name, schema: CommentLikeSchema },
    ]),
    PostsModule,
    KafkaClientModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
