import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';

export async function postMessage(body: {
  conversationId?: string;
  receiverId?: string;
  /** Caption; optional when `media_url` is set */
  content?: string;
  media_url?: string;
}) {
  const res = await api.post(API_ROUTES.MESSAGES, body);
  return res.data as {
    message: string;
    data: ChatMessageFromApi;
  };
}

export interface ChatMessageFromApi {
  id: string;
  conversationId: string;
  sender_id: string;
  content: string;
  media_url: string;
  createdAt: string;
  receiverIds: string[];
}

export async function fetchMessages(conversationId: string) {
  const res = await api.get(API_ROUTES.MESSAGES, {
    params: { conversationId },
  });
  return res.data as {
    message: string;
    data: Array<{
      id: string;
      sender_id: string;
      content: string;
      media_url: string;
      createdAt: string;
    }>;
  };
}

export async function fetchConversations() {
  const res = await api.get(API_ROUTES.CONVERSATIONS);
  return res.data as {
    message: string;
    data: import('../types').ConversationListItem[];
  };
}

export async function createGroupConversation(body: {
  group_name: string;
  member_ids: string[];
}) {
  const res = await api.post(API_ROUTES.CONVERSATIONS_GROUP, body);
  return res.data as {
    message: string;
    data: import('../types').ConversationListItem;
  };
}
