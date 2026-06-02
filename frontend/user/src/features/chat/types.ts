export interface ChatMessage {
  id: string;
  conversationId: string;
  sender_id: string;
  content: string;
  media_url: string;
  type?: 'text' | 'post_share' | 'system';
  shared_post_id?: string | null;
  createdAt: string;
}

export interface ConversationListItem {
  id: string;
  group_name: string | null;
  isGroup: boolean;
  last_message: string | null;
  participants: Array<{
    id: string;
    username?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  }>;
  last_message_row: {
    id: string;
    sender_id: string;
    content: string;
    media_url: string;
  } | null;
}
