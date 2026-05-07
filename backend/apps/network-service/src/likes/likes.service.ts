import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Like, LikeDocument } from './schemas/like.schema';
import { CommentLike, CommentLikeDocument } from './schemas/comment-like.schema';
import { PostsService } from '../posts/posts.service';
import { CommentsService } from '../comments/comments.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
    @InjectModel(CommentLike.name) private readonly commentLikeModel: Model<CommentLikeDocument>,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  async likePost(userId: string, postId: string): Promise<any> {
    try {
      // Verify post exists (throws 404 if not)
      await this.postsService.findById(postId);

      await new this.likeModel({ userId, postId: new Types.ObjectId(postId) }).save();
      await this.postsService.incrementLikeCount(postId, 1);

      return { message: 'Post liked successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).code === 11000) {
        throw new RpcException({ status: 409, message: 'You already liked this post' });
      }
      console.error('Error liking post', error);
      throw new RpcException({ status: 500, message: 'Failed to like post' });
    }
  }

  async unlikePost(userId: string, postId: string): Promise<any> {
    try {
      const deleted = await this.likeModel
        .findOneAndDelete({ userId, postId: new Types.ObjectId(postId) })
        .exec();
      if (!deleted) {
        throw new RpcException({ status: 404, message: 'You have not liked this post' });
      }

      await this.postsService.incrementLikeCount(postId, -1);

      return { message: 'Post unliked successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error unliking post', error);
      throw new RpcException({ status: 500, message: 'Failed to unlike post' });
    }
  }

  async getPostLikes(postId: string, limit = 20, skip = 0): Promise<any> {
    try {
      const likes = await this.likeModel
        .find({ postId: new Types.ObjectId(postId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('userId createdAt -_id')
        .exec();
      return { data: likes };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting post likes', error);
      throw new RpcException({ status: 500, message: 'Failed to get post likes' });
    }
  }

  async likeComment(userId: string, commentId: string): Promise<any> {
    try {
      // Verify comment exists (throws 404 if not)
      await this.commentsService.findById(commentId);

      await new this.commentLikeModel({ userId, commentId: new Types.ObjectId(commentId) }).save();
      await this.commentsService.incrementLikeCount(commentId, 1);

      return { message: 'Comment liked successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).code === 11000) {
        throw new RpcException({ status: 409, message: 'You already liked this comment' });
      }
      console.error('Error liking comment', error);
      throw new RpcException({ status: 500, message: 'Failed to like comment' });
    }
  }

  async unlikeComment(userId: string, commentId: string): Promise<any> {
    try {
      const deleted = await this.commentLikeModel
        .findOneAndDelete({ userId, commentId: new Types.ObjectId(commentId) })
        .exec();
      if (!deleted) {
        throw new RpcException({ status: 404, message: 'You have not liked this comment' });
      }

      await this.commentsService.incrementLikeCount(commentId, -1);

      return { message: 'Comment unliked successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error unliking comment', error);
      throw new RpcException({ status: 500, message: 'Failed to unlike comment' });
    }
  }
}
