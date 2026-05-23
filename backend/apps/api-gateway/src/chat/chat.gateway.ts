import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin:
      process.env.FRONTEND_ORIGIN?.split(',').map((o) => o.trim()) ?? [
        'http://localhost:5173',
      ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const fromAuth = client.handshake.auth?.token;
      const header = client.handshake.headers?.authorization;
      const raw = fromAuth ?? header;
      const token =
        typeof raw === 'string' && raw.startsWith('Bearer ')
          ? raw.slice(7)
          : raw;
      if (!token || typeof token !== 'string') {
        client.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      const userId = payload.sub as string;
      client.data.userId = userId;
      await client.join(`user:${userId}`);
    } catch {
      client.disconnect();
    }
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      to?: string;
      /** Fan-out for group chats: other participant user ids */
      toUsers?: string[];
      conversationId?: string;
    },
  ) {
    const from = client.data.userId as string | undefined;
    if (!from) return;
    const targets = new Set<string>();
    if (Array.isArray(body?.toUsers)) {
      for (const id of body.toUsers) {
        if (typeof id === 'string' && id.length > 0 && id !== from) {
          targets.add(id);
        }
        if (targets.size > 64) break;
      }
    }
    const single = body?.to;
    if (typeof single === 'string' && single !== from) {
      targets.add(single);
    }
    if (targets.size === 0) return;
    const payload = { from, conversationId: body?.conversationId };
    for (const uid of targets) {
      client.to(`user:${uid}`).emit('typing', payload);
    }
  }

  @SubscribeMessage('message_seen')
  handleSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() _body: { messageId?: string },
  ) {
    void _body;
  }

  /**
   * 1-1: pass `to`. Group: pass `toUsers` (all invitees except caller).
   * Targets receive `incoming_call`.
   */
  @SubscribeMessage('call_user')
  handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      to?: string;
      toUsers?: string[];
      meetingId: string;
      conversationId?: string;
      callType?: 'audio' | 'video';
      isGroupCall?: boolean;
      callerName?: string;
    },
  ) {
    const from = client.data.userId as string | undefined;
    if (!from || !body?.meetingId || typeof body.meetingId !== 'string') {
      return;
    }
    const mid = body.meetingId.trim();
    if (!mid) return;

    const targets = new Set<string>();
    if (typeof body.to === 'string' && body.to.length > 0 && body.to !== from) {
      targets.add(body.to);
    }
    if (Array.isArray(body.toUsers)) {
      for (const id of body.toUsers) {
        if (typeof id === 'string' && id.length > 0 && id !== from) {
          targets.add(id);
        }
        if (targets.size >= 48) break;
      }
    }
    if (targets.size === 0) return;

    const isGroup =
      Boolean(body.isGroupCall) || (targets.size > 1 && !body.to);
    const payload = {
      from,
      meetingId: mid,
      conversationId:
        typeof body.conversationId === 'string' ? body.conversationId : undefined,
      callType: body.callType === 'audio' ? 'audio' : 'video',
      isGroupCall: isGroup,
      callerName:
        typeof body.callerName === 'string'
          ? body.callerName.trim().slice(0, 120)
          : undefined,
    };

    for (const uid of targets) {
      client.to(`user:${uid}`).emit('incoming_call', payload);
    }
  }

  /** Callee notifies caller they are joining the same meetingId. */
  @SubscribeMessage('accept_call')
  handleAcceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { to: string; meetingId: string },
  ) {
    const from = client.data.userId as string | undefined;
    if (!from || typeof body?.to !== 'string' || !body.to || body.to === from) {
      return;
    }
    if (typeof body.meetingId !== 'string' || !body.meetingId.trim()) return;
    client.to(`user:${body.to}`).emit('call_accepted', {
      from,
      meetingId: body.meetingId.trim(),
    });
  }

  @SubscribeMessage('reject_call')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { to: string; meetingId: string },
  ) {
    const from = client.data.userId as string | undefined;
    if (!from || typeof body?.to !== 'string' || !body.to) return;
    client.to(`user:${body.to}`).emit('call_rejected', {
      from,
      meetingId:
        typeof body.meetingId === 'string' ? body.meetingId.trim() : '',
    });
  }

  /**
   * Notify peers the call is over (both 1-1 and group — client sends full peer list).
   * Set `forEveryone: true` to terminate a group call for all participants.
   * Reasons:
   *   - 'left'           → just this user is leaving (default)
   *   - 'ended_for_all'  → host pressed "End call for everyone"
   */
  @SubscribeMessage('end_call')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      to?: string;
      toUsers?: string[];
      meetingId: string;
      forEveryone?: boolean;
    },
  ) {
    const from = client.data.userId as string | undefined;
    if (!from || typeof body?.meetingId !== 'string' || !body.meetingId.trim()) {
      return;
    }
    const targets = new Set<string>();
    if (typeof body.to === 'string' && body.to.length > 0 && body.to !== from) {
      targets.add(body.to);
    }
    if (Array.isArray(body.toUsers)) {
      for (const id of body.toUsers) {
        if (typeof id === 'string' && id.length > 0 && id !== from) {
          targets.add(id);
        }
        if (targets.size >= 48) break;
      }
    }
    const payload = {
      meetingId: body.meetingId.trim(),
      endedBy: from,
      forEveryone: body.forEveryone === true,
    };
    for (const uid of targets) {
      client.to(`user:${uid}`).emit('call_ended', payload);
    }
  }
}
