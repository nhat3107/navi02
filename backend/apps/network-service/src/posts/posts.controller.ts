import { Controller } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { PostsService } from './posts.service';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @MessagePattern('post.create', Transport.KAFKA)
  create(data: {authorId: string;content: string;mediaUrls?: string[];visibility?: string;}): Promise<any> {
    return this.postsService.create(data);
  }

  @MessagePattern('post.find_by_id', Transport.KAFKA)
  findById(data: { id: string; userId?: string }): Promise<any> {
    return this.postsService.findById(data.id, data.userId);
  }

  @MessagePattern('post.find_by_author', Transport.KAFKA)
  findByAuthor(data: {authorId: string;limit?: number;skip?: number}): Promise<any> {
    return this.postsService.findByAuthor(data.authorId, data.limit, data.skip);
  }

  @MessagePattern('post.feed', Transport.KAFKA)
  getFeed(data: {authorIds: string[];userId: string;limit?: number;skip?: number}): Promise<any> {
    return this.postsService.getFeed(data.authorIds, data.userId, data.limit, data.skip);
  }

  @MessagePattern('post.update', Transport.KAFKA)
  update(data: {id: string;authorId: string;content?: string;mediaUrls?: string[];visibility?: string}): Promise<any> {
    const { id, authorId, ...rest } = data;
    return this.postsService.update(id, authorId, rest);
  }

  @MessagePattern('post.delete', Transport.KAFKA)
  remove(data: { id: string; authorId: string }): Promise<any> {
    return this.postsService.remove(data.id, data.authorId);
  }
}
