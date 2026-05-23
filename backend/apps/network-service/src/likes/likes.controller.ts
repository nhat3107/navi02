import { Controller } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { LikesService } from './likes.service';

@Controller()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @MessagePattern('post.like', Transport.KAFKA)
  likePost(data: { userId: string; postId: string }): Promise<any> {
    return this.likesService.likePost(data.userId, data.postId);
  }

  @MessagePattern('post.unlike', Transport.KAFKA)
  unlikePost(data: { userId: string; postId: string }): Promise<any> {
    return this.likesService.unlikePost(data.userId, data.postId);
  }

  @MessagePattern('post.get_likes', Transport.KAFKA)
  getPostLikes(data: { postId: string; limit?: number; skip?: number }): Promise<any> {
    return this.likesService.getPostLikes(data.postId, data.limit, data.skip);
  }

  @MessagePattern('comment.like', Transport.KAFKA)
  likeComment(data: { userId: string; commentId: string }): Promise<any> {
    return this.likesService.likeComment(data.userId, data.commentId);
  }

  @MessagePattern('comment.unlike', Transport.KAFKA)
  unlikeComment(data: { userId: string; commentId: string }): Promise<any> {
    return this.likesService.unlikeComment(data.userId, data.commentId);
  }
}
