import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateGroupDto } from './dto/create-group-dto';
import { CreateMessageDto } from './dto/create-message-dto';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @HttpCode(HttpStatus.OK)
  @Post('messages')
  createMessage(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.chatService.createMessage(userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('messages')
  listMessages(
    @CurrentUser('sub') userId: string,
    @Query('conversationId') conversationId: string,
  ) {
    if (!conversationId?.trim()) {
      throw new BadRequestException('conversationId is required');
    }
    return this.chatService.listMessages(userId, conversationId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('conversations')
  listConversations(@CurrentUser('sub') userId: string) {
    return this.chatService.listConversations(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('conversations/group')
  createGroup(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.chatService.createGroup(userId, {
      group_name: dto.group_name,
      member_ids: dto.member_ids,
    });
  }
}
