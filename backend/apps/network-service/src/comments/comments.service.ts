import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly postsService: PostsService,
  ) {}

  async create(data: {
    authorId: string;
    postId: string;
    content?: string;
    mediaUrls?: string[];
    parentCommentId?: string | null;
  }): Promise<any> {
    try {
      const text = (data.content ?? '').trim();
      const media = (data.mediaUrls ?? []).filter(
        (u) => typeof u === 'string' && u.trim().length > 0,
      );
      if (!text && media.length === 0) {
        throw new RpcException({
          status: 400,
          message: 'content or mediaUrls is required',
        });
      }

      // Verify the target post exists (throws 404 RpcException if not found)
      await this.postsService.findById(data.postId);

      // If replying, verify parent comment exists and belongs to the same post
      if (data.parentCommentId) {
        const parentComment = await this.commentModel
          .findById(data.parentCommentId)
          .exec();
        if (!parentComment) {
          throw new RpcException({ status: 404, message: `Parent comment ${data.parentCommentId} not found` });
        }
        if (parentComment.postId.toString() !== data.postId) {
          throw new RpcException({ status: 400, message: 'Parent comment does not belong to the specified post' });
        }
      }

      const created = new this.commentModel({
        authorId: data.authorId,
        postId: new Types.ObjectId(data.postId),
        parentCommentId: data.parentCommentId
          ? new Types.ObjectId(data.parentCommentId)
          : null,
        content: text,
        mediaUrls: media,
      });
      const saved = await created.save();

      // Keep denormalized counters in sync.
      if (data.parentCommentId) {
        await this.commentModel
          .updateOne(
            { _id: data.parentCommentId },
            { $inc: { replyCount: 1 } },
          )
          .exec();
      } else {
        await this.postsService.incrementCommentCount(data.postId, 1);
      }

      return { message: 'Comment created successfully', data: saved };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error creating comment', error);
      throw new RpcException({ status: 500, message: 'Failed to create comment' });
    }
  }

  async findByPost(postId: string, limit = 20, skip = 0): Promise<any> {
    try {
      const comments = await this.commentModel
        .find({ postId: new Types.ObjectId(postId), parentCommentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return { data: comments };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error finding comments by post', error);
      throw new RpcException({ status: 500, message: 'Failed to find comments' });
    }
  }

  async findReplies(parentCommentId: string, limit = 20, skip = 0): Promise<any> {
    try {
      const replies = await this.commentModel
        .find({ parentCommentId: new Types.ObjectId(parentCommentId) })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return { data: replies };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error finding replies', error);
      throw new RpcException({ status: 500, message: 'Failed to find replies' });
    }
  }

  async update(id: string, authorId: string, content: string): Promise<any> {
    try {
      const updated = await this.commentModel
        .findOneAndUpdate({ _id: id, authorId }, { content }, { new: true })
        .exec();
      if (!updated) {
        throw new RpcException({ status: 404, message: `Comment ${id} not found` });
      }
      return { message: 'Comment updated successfully', data: updated };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error updating comment', error);
      throw new RpcException({ status: 500, message: 'Failed to update comment' });
    }
  }

  async remove(id: string, authorId: string): Promise<any> {
    try {
      const comment = await this.commentModel
        .findOneAndDelete({ _id: id, authorId })
        .exec();
      if (!comment) {
        throw new RpcException({ status: 404, message: `Comment ${id} not found` });
      }

      if (comment.parentCommentId) {
        await this.commentModel
          .updateOne(
            { _id: comment.parentCommentId },
            { $inc: { replyCount: -1 } },
          )
          .exec();
      } else {
        await this.postsService.incrementCommentCount(
          comment.postId.toString(),
          -1,
        );
      }
      return { message: 'Comment deleted successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error removing comment', error);
      throw new RpcException({ status: 500, message: 'Failed to remove comment' });
    }
  }

  async findById(commentId: string): Promise<CommentDocument> {
    try {
      const comment = await this.commentModel.findById(commentId).exec();
      if (!comment) {
        throw new RpcException({ status: 404, message: `Comment ${commentId} not found` });
      }
      return comment;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).name === 'CastError') {
        throw new RpcException({ status: 404, message: `Comment ${commentId} not found` });
      }
      console.error('Error finding comment by id', error);
      throw new RpcException({ status: 500, message: 'Failed to find comment' });
    }
  }

  async incrementLikeCount(commentId: string, delta = 1): Promise<void> {
    try {
      await this.commentModel
        .updateOne({ _id: commentId }, { $inc: { likeCount: delta } })
        .exec();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error incrementing comment like count', error);
      throw new RpcException({ status: 500, message: 'Failed to update comment like count' });
    }
  }
}
