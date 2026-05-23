import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
};

@Injectable()
export class ChatServiceService implements OnModuleInit {
  constructor(
    @InjectModel(Conversation.name)
    private readonly convModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly msgModel: Model<MessageDocument>,
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
    @Inject('USER_KAFKA_SERVICE') private readonly userKafka: ClientKafka,
  ) {}

  onModuleInit() {
    this.userKafka.subscribeToResponseOf('user.lookup_profiles');
  }

  private async hydrateProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
    const unique = [
      ...new Set(ids.map((x) => `${x}`.trim()).filter(Boolean)),
    ].slice(0, 200);
    const map = new Map<string, ProfileRow>();
    if (unique.length === 0) return map;

    try {
      const res = (await firstValueFrom(
        this.userKafka.send('user.lookup_profiles', { ids: unique }).pipe(
          catchError((err) => {
            console.error('user.lookup_profiles failed', err);
            return of({ message: 'err', data: [] as ProfileRow[] });
          }),
        ),
      )) as { data?: ProfileRow[] };
      for (const p of res.data ?? []) {
        if (!p?.id) continue;
        map.set(p.id, {
          id: p.id,
          username: p.username ?? '',
          full_name: p.full_name ?? '',
          avatar_url: p.avatar_url ?? '',
        });
      }
    } catch (e) {
      console.error('hydrateProfiles', e);
    }

    for (const id of unique) {
      if (!map.has(id)) {
        map.set(id, {
          id,
          username: '',
          full_name: '',
          avatar_url: '',
        });
      }
    }
    return map;
  }

  async create_group(data: {
    creatorId: string;
    groupName: string;
    memberIds: string[];
  }): Promise<any> {
    const { creatorId, groupName, memberIds } = data;
    const name = groupName?.trim();
    if (!name) {
      throw new RpcException({
        status: 400,
        message: 'group_name is required',
      });
    }
    if (name.length > 120) {
      throw new RpcException({
        status: 400,
        message: 'group_name is too long (max 120 characters)',
      });
    }
    const others = [
      ...new Set(
        (memberIds ?? [])
          .map((id) => `${id}`.trim())
          .filter((id) => id.length > 0 && id !== creatorId),
      ),
    ];
    if (others.length < 2) {
      throw new RpcException({
        status: 400,
        message: 'Add at least two other people to create a group',
      });
    }
    const participant_ids = [...others, creatorId].sort();
    const created = await this.convModel.create({
      is_group: true,
      group_name: name,
      participant_ids,
      last_message: '',
    });
    const id = created._id.toString();
    const profileMap = await this.hydrateProfiles(participant_ids);
    const participants = participant_ids.map(
      (pid) =>
        profileMap.get(pid) ?? {
          id: pid,
          username: '',
          full_name: '',
          avatar_url: '',
        },
    );
    return {
      message: 'Group created',
      data: {
        id,
        group_name: name,
        isGroup: true,
        last_message: null,
        participants,
        last_message_row: null,
      },
    };
  }

  private async findDmConversationId(
    userA: string,
    userB: string,
  ): Promise<string | null> {
    const doc = await this.convModel
      .findOne({
        is_group: false,
        participant_ids: { $all: [userA, userB], $size: 2 },
      })
      .exec();
    return doc?._id.toString() ?? null;
  }

  async send_message(data: {
    senderId: string;
    receiverId?: string;
    conversationId?: string;
    content?: string;
    mediaUrl?: string;
    type?: string;
    sharedPostId?: string;
  }): Promise<any> {
    const {
      senderId,
      receiverId,
      conversationId: inputConvId,
      content,
      mediaUrl = '',
      type = 'text',
      sharedPostId,
    } = data;
    const text = (content ?? '').trim();
    const media = (mediaUrl ?? '').trim();
    const isPostShare = type === 'post_share';

    if (isPostShare) {
      if (!sharedPostId?.trim()) {
        throw new RpcException({
          status: 400,
          message: 'sharedPostId is required when type is post_share',
        });
      }
    } else {
      if (!text && !media) {
        throw new RpcException({
          status: 400,
          message: 'Message text or media is required',
        });
      }
    }
    let conversationId = inputConvId ?? '';
    let receiverIds: string[] = [];

    if (conversationId) {
      const conv = await this.convModel.findById(conversationId).exec();
      if (!conv) {
        throw new RpcException({ status: 404, message: 'Conversation not found' });
      }
      if (!conv.participant_ids.includes(senderId)) {
        throw new RpcException({ status: 403, message: 'Not a participant' });
      }
      receiverIds = conv.participant_ids.filter((id) => id !== senderId);
    } else {
      if (!receiverId) {
        throw new RpcException({
          status: 400,
          message: 'receiverId is required when conversationId is omitted',
        });
      }
      if (receiverId === senderId) {
        throw new RpcException({ status: 400, message: 'Cannot message yourself' });
      }
      const existing = await this.findDmConversationId(senderId, receiverId);
      if (existing) {
        conversationId = existing;
      } else {
        const created = await this.convModel.create({
          is_group: false,
          participant_ids: [senderId, receiverId].sort(),
          last_message: '',
        });
        conversationId = created._id.toString();
      }
      receiverIds = [receiverId];
    }

    const msgDoc = await this.msgModel.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content: text,
      media_url: media,
      type: isPostShare ? 'post_share' : 'text',
      shared_post_id: isPostShare ? (sharedPostId ?? null) : null,
    });

    const now = new Date();
    const lastPreview = isPostShare
    ? 'Shared a post'
    : (text || (media ? 'Sent a photo or video' : '')).slice(0, 500,);
    await this.convModel.updateOne(
      { _id: conversationId },
      {
        $set: {
          last_message: lastPreview,
          last_message_at: now,
        },
      },
    );

    const preview = isPostShare
    ? 'Shared a post'
    : (text || (media ? 'Sent media' : '')).slice(0, 120);
    for (const rid of receiverIds) {
      try {
        this.kafkaclient.emit('chat.message', {
          type: 'MESSAGE_CREATED',
          messageId: msgDoc._id.toString(),
          senderId,
          receiverId: rid,
          content: msgDoc.content,
        });
        this.kafkaclient.emit('chat.notification', {
          type: 'NEW_MESSAGE',
          userId: rid,
          preview,
          senderId,
        });
      } catch (e) {
        console.error('Kafka emit failed', e);
      }
    }

    return {
      message: 'Message sent',
      data: {
        id: msgDoc._id.toString(),
        conversationId,
        sender_id: msgDoc.sender_id,
        content: msgDoc.content,
        media_url: msgDoc.media_url,
        type: msgDoc.type,
        shared_post_id: msgDoc.shared_post_id ?? null,
        createdAt: (msgDoc as { createdAt?: Date }).createdAt?.toISOString?.() ?? now.toISOString(),
        receiverIds,
      },
    };
  }

  async list_messages(data: {
    userId: string;
    conversationId: string;
    take?: number;
  }): Promise<any> {
    const { userId, conversationId, take = 50 } = data;
    const conv = await this.convModel.findById(conversationId).exec();
    if (!conv || !conv.participant_ids.includes(userId)) {
      throw new RpcException({ status: 403, message: 'Not a participant' });
    }
    const messages = await this.msgModel
      .find({ conversation_id: conversationId })
      .sort({ createdAt: 1 })
      .limit(take)
      .exec();

    return {
      message: 'ok',
      data: messages.map((m) => ({
        id: m._id.toString(),
        sender_id: m.sender_id,
        content: m.content,
        media_url: m.media_url,
        type: m.type ?? 'text',
        shared_post_id: m.shared_post_id ?? null,
        createdAt: (m as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString(),
      })),
    };
  }

  async list_conversations(data: { userId: string }): Promise<any> {
    const { userId } = data;
    const conversations = await this.convModel
      .find({ participant_ids: userId })
      .sort({ last_message_at: -1, updatedAt: -1 })
      .limit(100)
      .exec();

    const allParticipantIds = conversations.flatMap((c) => c.participant_ids);
    const profileMap = await this.hydrateProfiles(allParticipantIds);

    const dataOut = await Promise.all(
      conversations.map(async (c) => {
        const lastMsg = await this.msgModel
          .findOne({ conversation_id: c._id.toString() })
          .sort({ createdAt: -1 })
          .exec();
        return {
          id: c._id.toString(),
          group_name: c.group_name ?? null,
          isGroup: c.is_group,
          last_message: c.last_message ?? null,
          participants: c.participant_ids.map((pid) => {
            const p = profileMap.get(pid);
            return (
              p ?? {
                id: pid,
                username: '',
                full_name: '',
                avatar_url: '',
              }
            );
          }),
          last_message_row: lastMsg
            ? {
                id: lastMsg._id.toString(),
                sender_id: lastMsg.sender_id,
                content: lastMsg.content,
                media_url: lastMsg.media_url,
              }
            : null,
        };
      }),
    );

    return {
      message: 'ok',
      data: dataOut,
    };
  }
}
