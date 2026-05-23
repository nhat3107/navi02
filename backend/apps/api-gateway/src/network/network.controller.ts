import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NetworkService } from './network.service';
import { UserService } from '../user/user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { SharePostDto } from './dto/share-post.dto';
import { firstValueFrom } from 'rxjs';

@Controller('network')
export class NetworkController {
  constructor(
    private readonly networkService: NetworkService,
    private readonly userService: UserService,
  ) {}

  // Feed
  @HttpCode(HttpStatus.OK)
  @Get('feed')
  async get_feed(
    @CurrentUser('sub') userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    const followingResponse = await firstValueFrom(
      this.userService.get_following(userId),
    );
    const authorIds: string[] = (followingResponse.data || []).map(
      (user: any) => user.id,
    );
    // Include the user's own posts in their feed
    authorIds.push(userId);
    return this.networkService.getFeed(authorIds, userId, limit, skip);
  }

  // Posts
  @HttpCode(HttpStatus.CREATED)
  @Post('posts')
  create_post(
    @Body() dto: CreatePostDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.createPost(userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('posts/:id')
  find_post_by_id(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.findPostById(id, userId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('posts/author/:authorId')
  find_posts_by_author(
    @Param('authorId') authorId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.networkService.findPostsByAuthor(authorId, limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('posts/:id')
  update_post(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.updatePost(id, userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('posts/:id')
  delete_post(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.deletePost(id, userId);
  }

  // Post Likes
  @HttpCode(HttpStatus.OK)
  @Post('posts/:id/like')
  like_post(
    @Param('id') postId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.likePost(userId, postId);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('posts/:id/like')
  unlike_post(
    @Param('id') postId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.unlikePost(userId, postId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('posts/:id/likes')
  get_post_likes(
    @Param('id') postId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.networkService.getPostLikes(postId, limit, skip);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('posts/:id/share')
  share_post(
    @Param('id') postId: string,
    @Body() dto: SharePostDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.sharePost(userId, postId, dto?.content);
  }

  // Comments
  @HttpCode(HttpStatus.CREATED)
  @Post('comments')
  create_comment(
    @Body() dto: CreateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.createComment(userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('comments/post/:postId')
  find_comments_by_post(
    @Param('postId') postId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.networkService.findCommentsByPost(postId, limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Get('comments/:parentCommentId/replies')
  find_replies(
    @Param('parentCommentId') parentCommentId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.networkService.findReplies(parentCommentId, limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('comments/:id')
  update_comment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.updateComment(id, userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('comments/:id')
  delete_comment(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.deleteComment(id, userId);
  }

  // Comment Likes
  @HttpCode(HttpStatus.OK)
  @Post('comments/:id/like')
  like_comment(
    @Param('id') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.likeComment(userId, commentId);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('comments/:id/like')
  unlike_comment(
    @Param('id') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.unlikeComment(userId, commentId);
  }

  // Reports
  @HttpCode(HttpStatus.CREATED)
  @Post('reports')
  create_report(
    @Body() dto: CreateReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.createReport(userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('reports/:id')
  find_report_by_id(@Param('id') id: string) {
    return this.networkService.findReportById(id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('reports/status/:status')
  find_reports_by_status(
    @Param('status') status: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.networkService.findReportsByStatus(status, limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Get('reports/target/:targetType/:targetId')
  find_reports_by_target(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.networkService.findReportsByTarget(targetType, targetId);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('reports/:id/review')
  review_report(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networkService.reviewReport(id, userId, dto);
  }
}
