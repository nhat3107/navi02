import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  get_notifications(
    @CurrentUser('sub') userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.notificationService.getNotifications(userId, limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Get('unread-count')
  get_unread_count(@CurrentUser('sub') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/read')
  mark_as_read(
    @Param('id') notificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notificationService.markAsRead(userId, notificationId);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('read-all')
  mark_all_as_read(@CurrentUser('sub') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }
}
