import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UserService as UserDirectoryService } from '../user/user.service';
import { ChatGateway } from './chat.gateway';
import type { CreateMessageDto } from './dto/create-message-dto';

type ConversationListRow = {
  id: string;
  isGroup: boolean;
  participants: Array<{ id: string; username?: string; full_name?: string }>;
  group_name?: string | null;
  last_message?: string | null;
  last_message_row?: unknown;
};

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(
    @Inject('CHAT_KAFKA_SERVICE') private readonly kafka: ClientKafka,
    private readonly chatGateway: ChatGateway,
    private readonly userDirectory: UserDirectoryService,
  ) {}

  onModuleInit() {
    this.kafka.subscribeToResponseOf('chat.send_message');
    this.kafka.subscribeToResponseOf('chat.list_messages');
    this.kafka.subscribeToResponseOf('chat.list_conversations');
    this.kafka.subscribeToResponseOf('chat.create_group');
  }

  async createMessage(userId: string, dto: CreateMessageDto) {
    const text = (dto.content ?? '').trim();
    const media = (dto.media_url ?? '').trim();
    const isPostShare = dto.type === 'post_share';

    if (isPostShare) {
      if (!dto.sharedPostId?.trim()) {
        throw new BadRequestException(
          'sharedPostId is required when type is post_share',
        );
      }
    } else {
      if (!text && !media) {
        throw new BadRequestException('content or media_url is required');
      }
    }

    if (!dto.conversationId && !dto.receiverId) {
      throw new BadRequestException(
        'receiverId is required when conversationId is omitted',
      );
    }
    const res = (await firstValueFrom(
      this.kafka.send('chat.send_message', {
        senderId: userId,
        conversationId: dto.conversationId,
        receiverId: dto.receiverId,
        content: text,
        mediaUrl: media,
        type: dto.type ?? 'text',
        sharedPostId: dto.sharedPostId,
      }),
    )) as {
      message: string;
      data: {
        id: string;
        conversationId: string;
        sender_id: string;
        content: string;
        media_url: string;
        type: string;
        shared_post_id: string | null;
        createdAt: string;
        receiverIds: string[];
      };
    };
    const row = res.data;
    const payload = {
      message: {
        id: row.id,
        conversationId: row.conversationId,
        sender_id: row.sender_id,
        content: row.content,
        media_url: row.media_url,
        type: row.type,
        shared_post_id: row.shared_post_id,
        createdAt: row.createdAt,
      },
    };
    for (const rid of row.receiverIds ?? []) {
      this.chatGateway.emitToUser(rid, 'receive_message', payload);
    }
    return res;
  }

  listMessages(userId: string, conversationId: string) {
    return firstValueFrom(
      this.kafka.send('chat.list_messages', { userId, conversationId }),
    );
  }

  async listConversations(userId: string) {
    const res = (await firstValueFrom(
      this.kafka.send('chat.list_conversations', { userId }),
    )) as { message: string; data: ConversationListRow[] };
    await this.enrichParticipantProfiles(userId, res.data);
    return res;
  }

  async createGroup(
    userId: string,
    body: { group_name: string; member_ids: string[] },
  ) {
    const res = (await firstValueFrom(
      this.kafka.send('chat.create_group', {
        creatorId: userId,
        groupName: body.group_name,
        memberIds: body.member_ids ?? [],
      }),
    )) as { message: string; data: ConversationListRow };
    await this.enrichParticipantProfiles(userId, [res.data]);
    return res;
  }

  private async enrichParticipantProfiles(
    userId: string,
    items: ConversationListRow[],
  ) {
    const ids = new Set<string>();
    for (const c of items) {
      for (const p of c.participants ?? []) {
        if (p?.id && p.id !== userId) ids.add(p.id);
      }
    }
    if (ids.size === 0) return;
    const profilesRes = (await firstValueFrom(
      this.userDirectory.lookup_profiles([...ids]),
    )) as {
      data: Array<{ id: string; username: string; full_name: string }>;
    };
    const byId = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p] as const),
    );
    for (const c of items) {
      c.participants = (c.participants ?? []).map((p) => {
        const prof = byId.get(p.id);
        if (!prof) return p;
        return {
          ...p,
          username: prof.username,
          full_name: prof.full_name,
        };
      });
    }
  }
}
