import { Controller } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { ChatServiceService } from './chat-service.service';

@Controller()
export class ChatServiceController {
  constructor(private readonly chatService: ChatServiceService) {}

  @MessagePattern('chat.send_message', Transport.KAFKA)
  send_message(data: any): Promise<any> {
    return this.chatService.send_message(data);
  }

  @MessagePattern('chat.list_messages', Transport.KAFKA)
  list_messages(data: any): Promise<any> {
    return this.chatService.list_messages(data);
  }

  @MessagePattern('chat.list_conversations', Transport.KAFKA)
  list_conversations(data: any): Promise<any> {
    return this.chatService.list_conversations(data);
  }

  @MessagePattern('chat.create_group', Transport.KAFKA)
  create_group(data: any): Promise<any> {
    return this.chatService.create_group(data);
  }
}
