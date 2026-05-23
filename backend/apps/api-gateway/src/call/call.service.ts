import { BadRequestException, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CallService {
  /**
   * VideoSDK JWT — same shape as dashboard / server examples (apikey, permissions, version).
   */
  generateToken(): { token: string } {
    const apiKey = process.env.VIDEOSDK_API_KEY?.trim();
    const secret = process.env.VIDEOSDK_SECRET?.trim();
    if (!apiKey || !secret) {
      throw new BadRequestException(
        'Video calls are not configured. Set VIDEOSDK_API_KEY and VIDEOSDK_SECRET on the API gateway.',
      );
    }
    const token = jwt.sign(
      {
        apikey: apiKey,
        permissions: ['allow_join'],
        version: 2,
      },
      secret,
      { expiresIn: '1h', algorithm: 'HS256' },
    );
    return { token };
  }

  /**
   * Creates a VideoSDK room and returns JWT + `roomId` to use as `meetingId`.
   * Joining with a random UUID without creating a room causes SDK errors (null transport).
   */
  async createRoomAndToken(): Promise<{ token: string; meetingId: string }> {
    const { token } = this.generateToken();
    const res = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `VideoSDK room create failed (${res.status}): ${raw.slice(0, 500)}`,
      );
    }

    let data: {
      roomId?: string;
      id?: string;
      data?: { roomId?: string };
    };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      throw new BadRequestException('VideoSDK room create returned invalid JSON');
    }

    const meetingId = data.roomId ?? data.data?.roomId;
    if (!meetingId || typeof meetingId !== 'string') {
      throw new BadRequestException(
        'VideoSDK did not return a room id. Check API key and secret.',
      );
    }

    return { token, meetingId };
  }
}
