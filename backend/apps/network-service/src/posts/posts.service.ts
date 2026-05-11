import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Post, PostDocument } from './schemas/post.schema';
import { Like, LikeDocument } from '../likes/schemas/like.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
  ) {}

  async create(data: {authorId: string;content: string;mediaUrls?: string[];visibility?: string}): Promise<any> {
    try {
      const created = new this.postModel(data);
      const saved = await created.save();
      return { message: 'Post created successfully', data: saved };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error creating post', error);
      throw new RpcException({ status: 500, message: 'Failed to create post' });
    }
  }

  async findById(id: string, userId?: string): Promise<any> {
    try {
      const post = await this.postModel.findById(id).lean().exec();
      if (!post) {
        throw new RpcException({ status: 404, message: `Post ${id} not found` });
      }

      let liked = false;
      if (userId) {
        const likeRecord = await this.likeModel
          .findOne({ userId, postId: new Types.ObjectId(id) })
          .lean()
          .exec();
        liked = !!likeRecord;
      }

      return { data: { ...post, liked } };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).name === 'CastError') {
        throw new RpcException({ status: 404, message: `Post ${id} not found` });
      }
      console.error('Error finding post by id', error);
      throw new RpcException({ status: 500, message: 'Failed to find post' });
    }
  }

  async findByAuthor(authorId: string, limit = 20, skip = 0): Promise<any> {
    try {
      const posts = await this.postModel
        .find({ authorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return { data: posts };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error finding posts by author', error);
      throw new RpcException({ status: 500, message: 'Failed to find posts' });
    }
  }

  async getFeed(authorIds: string[], userId: string, limit = 20, skip = 0): Promise<any> {
    try {
      const posts = await this.postModel
        .find({ authorId: { $in: authorIds }, visibility: { $ne: 'private' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      // Batch-check which posts this user has liked
      const postIds = posts.map((p) => p._id);
      const likedRecords = await this.likeModel
        .find({ userId, postId: { $in: postIds } })
        .select('postId')
        .lean()
        .exec();
      const likedSet = new Set(likedRecords.map((l) => l.postId.toString()));

      const data = posts.map((post) => ({
        ...post,
        liked: likedSet.has(post._id.toString()),
      }));

      return { data };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting feed', error);
      throw new RpcException({ status: 500, message: 'Failed to get feed' });
    }
  }

  async update(id: string, authorId: string, data: Partial<{ content: string; mediaUrls: string[]; visibility: string }>): Promise<any> {
    try {
      const updated = await this.postModel
        .findOneAndUpdate({ _id: id, authorId }, data, { returnDocument: 'after' })
        .exec();
      if (!updated) {
        throw new RpcException({ status: 403, message: 'You can only update your own posts' });
      }
      return { message: 'Post updated successfully', data: updated };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error updating post', error);
      throw new RpcException({ status: 500, message: 'Failed to update post' });
    }
  }

  async remove(id: string, authorId: string): Promise<any> {
    try {
      const res = await this.postModel
        .findOneAndDelete({ _id: id, authorId })
        .exec();
      if (!res) {
        throw new RpcException({ status: 403, message: 'You can only delete your own posts' });
      }
      return { message: 'Post deleted successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error removing post', error);
      throw new RpcException({ status: 500, message: 'Failed to remove post' });
    }
  }

  // Denormalized counter helpers — called on comment/like/share events.
  async incrementCommentCount(postId: string, delta = 1): Promise<void> {
    try {
      await this.postModel
        .updateOne({ _id: postId }, { $inc: { commentCount: delta } })
        .exec();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error incrementing comment count', error);
      throw new RpcException({ status: 500, message: 'Failed to update comment count' });
    }
  }

  async incrementLikeCount(postId: string, delta = 1): Promise<void> {
    try {
      await this.postModel
        .updateOne({ _id: postId }, { $inc: { likeCount: delta } })
        .exec();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error incrementing like count', error);
      throw new RpcException({ status: 500, message: 'Failed to update like count' });
    }
  }

  async incrementShareCount(postId: string, delta = 1): Promise<void> {
    try {
      await this.postModel
        .updateOne({ _id: postId }, { $inc: { shareCount: delta } })
        .exec();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error incrementing share count', error);
      throw new RpcException({ status: 500, message: 'Failed to update share count' });
    }
  }
}
