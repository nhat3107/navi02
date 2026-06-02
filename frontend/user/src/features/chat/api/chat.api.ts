import { api } from '../../../shared/utils/axios';
import { API_ROUTES, apiConversationLeave, apiConversationMembers } from '../../../shared/constants/routes';

export async function postMessage(body: {
  conversationId?: string;
  receiverId?: string;
  /** Caption; optional when `media_url` or `sharedPostId` is set */
  content?: string;
  media_url?: string;
  type?: 'text' | 'post_share';
  sharedPostId?: string;
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
  type?: string;
  shared_post_id?: string | null;
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
      type?: string;
      shared_post_id?: string | null;
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

export async function leaveGroupConversation(conversationId: string) {
  const res = await api.post(apiConversationLeave(conversationId));
  return res.data as {
    message: string;
    data: { conversationId: string };
  };
}

export async function addGroupMembers(
  conversationId: string,
  member_ids: string[],
) {
  const res = await api.post(apiConversationMembers(conversationId), {
    member_ids,
  });
  return res.data as {
    message: string;
    data: {
      conversation: import('../types').ConversationListItem;
    };
  };
}
