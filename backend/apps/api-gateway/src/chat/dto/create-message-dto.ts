export class CreateMessageDto {
  conversationId?: string;
  receiverId?: string;
  /** Optional caption when media_url or sharedPostId is set */
  content?: string;
  media_url?: string;
  /** Message type: 'text' (default) | 'post_share' */
  type?: 'text' | 'post_share';
  /** Required when type = 'post_share'. The Post ObjectId being shared. */
  sharedPostId?: string;
}
