import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationRealtimeRelayService } from './notification-realtime-relay.service';

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin:
      process.env.FRONTEND_ORIGIN?.split(',').map((o) => o.trim()) ?? [
        'http://localhost:5173',
      ],
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly relay: NotificationRealtimeRelayService,
  ) {}

  afterInit(): void {
    void this.relay.start(this).catch((err) => {
      console.error('Notification relay failed to start:', err);
    });
  }

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

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
