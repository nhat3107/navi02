import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';

const NETWORK_KAFKA_RPC = [
  'post.create',
  'post.find_by_id',
  'post.find_by_author',
  'post.feed',
  'post.update',
  'post.delete',
  'post.like',
  'post.unlike',
  'post.get_likes',
  'post.share',
  'comment.create',
  'comment.find_by_post',
  'comment.find_replies',
  'comment.update',
  'comment.delete',
  'comment.like',
  'comment.unlike',
  'report.create',
  'report.find_by_id',
  'report.find_by_status',
  'report.find_by_target',
  'report.review',
] as const;

@Injectable()
export class NetworkService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
  ) {}

  onModuleInit() {
    for (const pattern of NETWORK_KAFKA_RPC) {
      this.kafkaclient.subscribeToResponseOf(pattern);
    }
  }

  // Posts
  createPost(authorId: string, dto: CreatePostDto) {
    return this.kafkaclient.send('post.create', { authorId, ...dto });
  }

  findPostById(id: string, userId?: string) {
    return this.kafkaclient.send('post.find_by_id', { id, userId });
  }

  findPostsByAuthor(authorId: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('post.find_by_author', {
      authorId,
      limit,
      skip,
    });
  }

  getFeed(authorIds: string[], userId: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('post.feed', { authorIds, userId, limit, skip });
  }

  updatePost(id: string, authorId: string, dto: UpdatePostDto) {
    return this.kafkaclient.send('post.update', { id, authorId, ...dto });
  }

  deletePost(id: string, authorId: string) {
    return this.kafkaclient.send('post.delete', { id, authorId });
  }

  // Post Likes
  likePost(userId: string, postId: string) {
    return this.kafkaclient.send('post.like', { userId, postId });
  }

  unlikePost(userId: string, postId: string) {
    return this.kafkaclient.send('post.unlike', { userId, postId });
  }

  getPostLikes(postId: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('post.get_likes', { postId, limit, skip });
  }

  sharePost(userId: string, postId: string, content?: string) {
    return this.kafkaclient.send('post.share', { userId, postId, content });
  }

  // Comments
  createComment(authorId: string, dto: CreateCommentDto) {
    return this.kafkaclient.send('comment.create', { authorId, ...dto });
  }

  findCommentsByPost(postId: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('comment.find_by_post', {
      postId,
      limit,
      skip,
    });
  }

  findReplies(parentCommentId: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('comment.find_replies', {
      parentCommentId,
      limit,
      skip,
    });
  }

  updateComment(id: string, authorId: string, dto: UpdateCommentDto) {
    return this.kafkaclient.send('comment.update', {
      id,
      authorId,
      content: dto.content,
    });
  }

  deleteComment(id: string, authorId: string) {
    return this.kafkaclient.send('comment.delete', { id, authorId });
  }

  // Comment Likes
  likeComment(userId: string, commentId: string) {
    return this.kafkaclient.send('comment.like', { userId, commentId });
  }

  unlikeComment(userId: string, commentId: string) {
    return this.kafkaclient.send('comment.unlike', { userId, commentId });
  }

  // Reports
  createReport(reporterId: string, dto: CreateReportDto) {
    return this.kafkaclient.send('report.create', { reporterId, ...dto });
  }

  findReportById(id: string) {
    return this.kafkaclient.send('report.find_by_id', { id });
  }

  findReportsByStatus(status: string, limit?: number, skip?: number) {
    return this.kafkaclient.send('report.find_by_status', {
      status,
      limit,
      skip,
    });
  }

  findReportsByTarget(targetType: string, targetId: string) {
    return this.kafkaclient.send('report.find_by_target', {
      targetType,
      targetId,
    });
  }

  reviewReport(id: string, reviewerId: string, dto: ReviewReportDto) {
    return this.kafkaclient.send('report.review', {
      id,
      reviewerId,
      status: dto.status,
    });
  }
}
