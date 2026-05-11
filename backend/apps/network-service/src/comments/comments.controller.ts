import { Controller } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @MessagePattern('comment.create', Transport.KAFKA)
  create(data: {
    authorId: string;
    postId: string;
    content?: string;
    mediaUrls?: string[];
    parentCommentId?: string | null;
  }): Promise<any> {
    return this.commentsService.create(data);
  }

  @MessagePattern('comment.find_by_post', Transport.KAFKA)
  findByPost(data: {postId: string;limit?: number;skip?: number}): Promise<any> {
    return this.commentsService.findByPost(data.postId, data.limit, data.skip);
  }

  @MessagePattern('comment.find_replies', Transport.KAFKA)
  findReplies(data: {parentCommentId: string;limit?: number;skip?: number}): Promise<any> {
    return this.commentsService.findReplies(
      data.parentCommentId,
      data.limit,
      data.skip,
    );
  }

  @MessagePattern('comment.update', Transport.KAFKA)
  update(data: {id: string;authorId: string;content: string}): Promise<any> {
    return this.commentsService.update(data.id, data.authorId, data.content);
  }

  @MessagePattern('comment.delete', Transport.KAFKA)
  remove(data: { id: string; authorId: string }): Promise<any> {
    return this.commentsService.remove(data.id, data.authorId);
  }
}
