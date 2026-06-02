import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { Post, PostDocument, PostVisibility } from './schemas/post.schema';
import { Like, LikeDocument } from '../likes/schemas/like.schema';
import { Share, ShareDocument } from './schemas/share.schema';

const MODERATION_RPC = 'ai.moderate_content';
const MODERATION_TIMEOUT_MS = 45_000;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
    @InjectModel(Share.name) private readonly shareModel: Model<ShareDocument>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  private async assertAuthorCanPost(authorId: string): Promise<void> {
    try {
      const res = (await firstValueFrom(
        this.kafkaClient.send<{ allowed: boolean; message?: string }>(
          'auth.check_posting_allowed',
          { userId: authorId },
        ),
      )) as { allowed?: boolean; message?: string };
      if (res?.allowed === false) {
        throw new RpcException({
          status: 403,
          message: res.message ?? 'You are not allowed to post right now',
        });
      }
    } catch (err) {
      if (err instanceof RpcException) throw err;
      this.logger.warn(
        `Posting permission check failed for ${authorId} — allowing post`,
      );
    }
  }

  async create(data: {
    authorId: string;
    content?: string;
    mediaUrls?: string[];
    visibility?: string;
  }): Promise<any> {
    try {
      await this.assertAuthorCanPost(data.authorId);

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

      const requested = this.normalizeAudienceVisibility(data.visibility);
      const awaitsPublicModeration = requested === PostVisibility.PUBLIC;
      const created = new this.postModel({
        authorId: data.authorId,
        content: text,
        mediaUrls: media,
        // Hold public-intent posts until AI moderation — followers never see pending.
        visibility: awaitsPublicModeration
          ? PostVisibility.PENDING
          : requested,
      });
      const saved = await created.save();
      const postId = String(saved._id);

      let resultDoc: PostDocument = saved;

      if (awaitsPublicModeration) {
        await this.runAiModeration(postId, data.authorId, text, media);
        const refreshed = await this.postModel.findById(postId).exec();
        if (refreshed) resultDoc = refreshed;
      } else if (requested === PostVisibility.FOLLOWERS) {
        this.emitNewPostFanout(data.authorId, postId, text, media, requested);
      }

      return { message: 'Post created successfully', data: resultDoc };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error creating post', error);
      throw new RpcException({ status: 500, message: 'Failed to create post' });
    }
  }

  private async runAiModeration(
    postId: string,
    authorId: string,
    text: string,
    media: string[],
  ): Promise<void> {
    try {
      const res = (await firstValueFrom(
        this.kafkaClient
          .send<{ status: 'safe' | 'harmful' }>(MODERATION_RPC, {
            contentId: postId,
            authorId,
            text,
            images: media,
          })
          .pipe(timeout(MODERATION_TIMEOUT_MS)),
      )) as { status?: 'safe' | 'harmful' };

      const status = res?.status === 'harmful' ? 'harmful' : 'safe';
      this.logger.log(
        `AI moderation RPC response postId=${postId}: ${JSON.stringify(res)}`,
      );
      await this.applyModerationResult({
        contentId: postId,
        authorId,
        status,
      });
    } catch (err) {
      this.logger.error(
        `AI moderation RPC failed for post ${postId} — post stays pending (hidden from followers)`,
        err,
      );
      const stillPending = await this.postModel
        .findOne({
          _id: postId,
          authorId,
          visibility: PostVisibility.PENDING,
        })
        .select('_id')
        .lean()
        .exec();
      if (stillPending) {
        this.emitPostPendingNotification(authorId, postId);
      }
    }
  }

  async applyModerationResult(data: {
    contentId: string;
    authorId: string;
    status: 'safe' | 'harmful';
  }): Promise<void> {
    const postId = data.contentId?.trim();
    if (!postId) return;

    const post = await this.postModel.findById(postId).exec();
    if (!post) return;
    if (post.authorId !== data.authorId) return;

    const vis = post.visibility;
    const inModerationHold = vis === PostVisibility.PENDING;
    const legacyPublic = vis === PostVisibility.PUBLIC;
    if (!inModerationHold && !legacyPublic) return;

    if (data.status === 'harmful') {
      if (legacyPublic) {
        post.visibility = PostVisibility.PENDING;
        await post.save();
      }
      this.emitPostPendingNotification(post.authorId, postId);
      this.logger.warn(
        `Post ${postId} held as pending after AI moderation (visibility=pending)`,
      );
      return;
    }

    post.visibility = PostVisibility.PUBLIC;
    await post.save();
    this.logger.log(
      `Post ${postId} passed AI moderation (now public, fan-out to followers)`,
    );

    const text = (post.content ?? '').trim();
    const media = post.mediaUrls ?? [];
    this.emitNewPostFanout(
      post.authorId,
      postId,
      text,
      media,
      PostVisibility.PUBLIC,
    );
  }

  async findById(id: string, userId?: string): Promise<any> {
    try {
      const post = await this.postModel.findById(id).lean().exec();
      if (!post) {
        throw new RpcException({ status: 404, message: `Post ${id} not found` });
      }

      this.assertPostViewable(post, userId);

      let liked = false;
      if (userId) {
        const likeRecord = await this.likeModel
          .findOne({ userId, postId: new Types.ObjectId(id) })
          .lean()
          .exec();
        liked = !!likeRecord;
      }

      const [enriched] = await this.attachOriginalPosts([
        { ...post, liked },
      ]);
      return { data: enriched };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as { name?: string }).name === 'CastError') {
        throw new RpcException({ status: 404, message: `Post ${id} not found` });
      }
      console.error('Error finding post by id', error);
      throw new RpcException({ status: 500, message: 'Failed to find post' });
    }
  }

  async findByAuthor(
    authorId: string,
    viewerId?: string,
    limit = 20,
    skip = 0,
  ): Promise<any> {
    try {
      const filter =
        viewerId && viewerId === authorId
          ? { authorId, visibility: { $nin: [PostVisibility.DELETED] } }
          : { authorId, visibility: PostVisibility.PUBLIC };

      const posts = await this.postModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
      return {
        data: await this.attachOriginalPosts(
          posts as unknown as Record<string, unknown>[],
        ),
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error finding posts by author', error);
      throw new RpcException({ status: 500, message: 'Failed to find posts' });
    }
  }

  async getFeed(
    authorIds: string[],
    userId: string,
    limit = 20,
    skip = 0,
  ): Promise<any> {
    try {
      const posts = await this.postModel
        .find({
          authorId: { $in: authorIds },
          visibility: PostVisibility.PUBLIC,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const postIds = posts.map((p) => p._id);
      const likedRecords = await this.likeModel
        .find({ userId, postId: { $in: postIds } })
        .select('postId')
        .lean()
        .exec();
      const likedSet = new Set(likedRecords.map((l) => l.postId.toString()));

      const data = await this.attachOriginalPosts(
        posts.map((post) => ({
          ...post,
          liked: likedSet.has(post._id.toString()),
        })),
      );

      return { data };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting feed', error);
      throw new RpcException({ status: 500, message: 'Failed to get feed' });
    }
  }

  async update(
    id: string,
    authorId: string,
    data: Partial<{ content: string; mediaUrls: string[]; visibility: string }>,
  ): Promise<any> {
    try {
      const patch = { ...data };
      if (patch.visibility !== undefined) {
        patch.visibility = this.normalizeAudienceVisibility(patch.visibility);
      }
      const updated = await this.postModel
        .findOneAndUpdate({ _id: id, authorId }, patch, {
          returnDocument: 'after',
        })
        .exec();
      if (!updated) {
        throw new RpcException({
          status: 403,
          message: 'You can only update your own posts',
        });
      }
      return { message: 'Post updated successfully', data: updated };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error updating post', error);
      throw new RpcException({ status: 500, message: 'Failed to update post' });
    }
  }

  async sharePost(
    userId: string,
    postId: string,
    caption?: string,
  ): Promise<any> {
    try {
      const original = await this.postModel.findById(postId).lean().exec();
      if (!original) {
        throw new RpcException({ status: 404, message: `Post ${postId} not found` });
      }

      if (original.authorId === userId) {
        throw new RpcException({
          status: 400,
          message: 'You cannot share your own post',
        });
      }

      if (original.visibility === PostVisibility.PRIVATE) {
        throw new RpcException({
          status: 403,
          message: 'Cannot share a private post',
        });
      }

      if (original.visibility === PostVisibility.PENDING) {
        throw new RpcException({
          status: 403,
          message: 'Cannot share a post under review',
        });
      }

      if (original.visibility === PostVisibility.DELETED) {
        throw new RpcException({
          status: 410,
          message: 'Post was removed',
        });
      }

      const existingShare = await this.shareModel
        .findOne({
          userId,
          originalPostId: new Types.ObjectId(postId),
        })
        .lean()
        .exec();
      if (existingShare) {
        throw new RpcException({
          status: 409,
          message: 'You have already shared this post',
        });
      }

      const captionText = (caption ?? '').trim();
      const repost = await new this.postModel({
        authorId: userId,
        content: captionText,
        mediaUrls: [],
        visibility: PostVisibility.PUBLIC,
        originalPostId: new Types.ObjectId(postId),
      }).save();

      try {
        await new this.shareModel({
          userId,
          originalPostId: new Types.ObjectId(postId),
          repostPostId: repost._id,
        }).save();
      } catch (error) {
        await this.postModel.findByIdAndDelete(repost._id).exec();
        if ((error as any).code === 11000) {
          throw new RpcException({
            status: 409,
            message: 'You have already shared this post',
          });
        }
        throw error;
      }

      await this.incrementShareCount(postId, 1);

      const preview = captionText
        ? captionText.length > 100
          ? `${captionText.substring(0, 100)}...`
          : captionText
        : 'Shared a post';

      this.kafkaClient.emit('notification.share_post', {
        senderId: userId,
        recipientId: original.authorId,
        postId,
        repostPostId: String(repost._id),
        preview,
      });

      const [enriched] = await this.attachOriginalPosts([
        repost.toObject() as unknown as Record<string, unknown>,
      ]);

      return {
        message: 'Post shared successfully',
        data: enriched,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if ((error as any).name === 'CastError') {
        throw new RpcException({ status: 404, message: `Post ${postId} not found` });
      }
      console.error('Error sharing post', error);
      throw new RpcException({ status: 500, message: 'Failed to share post' });
    }
  }

  async remove(id: string, authorId: string): Promise<any> {
    try {
      const res = await this.postModel
        .findOneAndDelete({ _id: id, authorId })
        .exec();
      if (!res) {
        throw new RpcException({
          status: 403,
          message: 'You can only delete your own posts',
        });
      }
      return { message: 'Post deleted successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error removing post', error);
      throw new RpcException({ status: 500, message: 'Failed to remove post' });
    }
  }

  async incrementCommentCount(postId: string, delta = 1): Promise<void> {
    try {
      await this.postModel
        .updateOne({ _id: postId }, { $inc: { commentCount: delta } })
        .exec();
    } catch (error) {
      console.error('Error incrementing comment count', error);
      throw new RpcException({
        status: 500,
        message: 'Failed to update comment count',
      });
    }
  }

  async incrementLikeCount(postId: string, delta = 1): Promise<void> {
    try {
      await this.postModel
        .updateOne({ _id: postId }, { $inc: { likeCount: delta } })
        .exec();
    } catch (error) {
      console.error('Error incrementing like count', error);
      throw new RpcException({
        status: 500,
        message: 'Failed to update like count',
      });
    }
  }

  async incrementShareCount(postId: string, delta = 1): Promise<void> {
    try {
      await this.postModel
        .updateOne({ _id: postId }, { $inc: { shareCount: delta } })
        .exec();
    } catch (error) {
      console.error('Error incrementing share count', error);
      throw new RpcException({
        status: 500,
        message: 'Failed to update share count',
      });
    }
  }

  private normalizeAudienceVisibility(raw?: string): PostVisibility {
    const v = (raw ?? 'public').trim().toLowerCase();
    if (v === PostVisibility.FOLLOWERS) return PostVisibility.FOLLOWERS;
    if (v === PostVisibility.PRIVATE) return PostVisibility.PRIVATE;
    if (v === PostVisibility.PENDING || v === PostVisibility.DELETED) {
      return PostVisibility.PUBLIC;
    }
    return PostVisibility.PUBLIC;
  }

  private readObjectId(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'object' && value !== null) {
      if ('$oid' in value) {
        return String((value as { $oid: string }).$oid);
      }
      if ('_id' in value) {
        return String((value as { _id: unknown })._id);
      }
      if (
        'toString' in value &&
        typeof (value as { toString: () => string }).toString === 'function'
      ) {
        const s = (value as { toString: () => string }).toString();
        if (s && s !== '[object Object]') return s;
      }
    }
    return String(value);
  }

  private async attachOriginalPosts<T extends Record<string, unknown>>(
    posts: T[],
  ): Promise<Array<T & { originalPost: Record<string, unknown> | null }>> {
    const originalIds = [
      ...new Set(
        posts
          .map((p) => this.readObjectId(p.originalPostId))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (originalIds.length === 0) {
      return posts.map((post) => ({ ...post, originalPost: null }));
    }

    const originals = await this.postModel
      .find({ _id: { $in: originalIds } })
      .lean()
      .exec();
    const byId = new Map(originals.map((p) => [String(p._id), p]));

    return posts.map((post) => {
      const originalId = this.readObjectId(post.originalPostId);
      if (!originalId) {
        return { ...post, originalPost: null };
      }
      const original = byId.get(originalId);
      return {
        ...post,
        originalPost: (original as Record<string, unknown> | undefined) ?? null,
      };
    });
  }

  private assertPostViewable(
    post: { authorId: string; visibility: string },
    userId?: string,
  ): void {
    const vis = post.visibility;
    if (vis === PostVisibility.DELETED) {
      throw new RpcException({
        status: 410,
        message: 'POST_REMOVED',
      });
    }
    if (vis === PostVisibility.PENDING) {
      if (!userId || userId !== post.authorId) {
        throw new RpcException({
          status: 403,
          message: 'POST_UNDER_REVIEW',
        });
      }
    }
    if (vis === PostVisibility.PRIVATE) {
      if (!userId || userId !== post.authorId) {
        throw new RpcException({ status: 404, message: `Post not found` });
      }
    }
  }

  private emitPostPendingNotification(authorId: string, postId: string): void {
    this.kafkaClient.emit('notification.post_pending', {
      recipientId: authorId,
      postId,
    });
  }

  private emitNewPostFanout(
    authorId: string,
    postId: string,
    text: string,
    media: string[],
    visibility: string,
  ): void {
    const preview = text
      ? text.length > 100
        ? `${text.substring(0, 100)}...`
        : text
      : media.length > 0
        ? 'Shared a photo'
        : 'New post';

    this.kafkaClient.emit('notification.new_post', {
      senderId: authorId,
      postId,
      preview,
      visibility,
    });
  }
}
