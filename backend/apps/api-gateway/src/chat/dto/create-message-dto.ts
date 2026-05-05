export class CreateMessageDto {
  conversationId?: string;
  receiverId?: string;
  /** Optional caption when media_url is set */
  content?: string;
  media_url?: string;
}
