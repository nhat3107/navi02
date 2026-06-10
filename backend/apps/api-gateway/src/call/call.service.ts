import { BadRequestException, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

type VideoSdkRole = 'rtc' | 'crawler';

@Injectable()
export class CallService {
  private getCredentials(): { apiKey: string; secret: string } {
    const apiKey = process.env.VIDEOSDK_API_KEY?.trim();
    const secret =
      process.env.VIDEOSDK_SECRET?.trim() ||
      process.env.VIDEOSDK_SECRET_KEY?.trim();
    if (!apiKey || !secret) {
      throw new BadRequestException(
        'Video calls are not configured. Set VIDEOSDK_API_KEY and VIDEOSDK_SECRET on the API gateway.',
      );
    }
    return { apiKey, secret };
  }

  /**
   * VideoSDK JWT — see https://docs.videosdk.live/javascript/guide/video-and-audio-calling-api-sdk/server-setup
   *
   * With `version: 2`, tokens must declare a role:
   * - `rtc`     → client SDK (MeetingProvider / init-config)
   * - `crawler` → REST APIs (create room)
   */
  private signToken(
    roles: VideoSdkRole[],
    roomId?: string,
  ): string {
    const { apiKey, secret } = this.getCredentials();
    const payload: Record<string, unknown> = {
      apikey: apiKey,
      permissions: ['allow_join'],
      version: 2,
      roles,
    };
    const trimmedRoom = roomId?.trim();
    if (trimmedRoom) {
      payload.roomId = trimmedRoom;
    }
    return jwt.sign(payload, secret, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });
  }

  /** Client SDK token — used by MeetingProvider to join a room. */
  generateRtcToken(roomId?: string): string {
    return this.signToken(['rtc'], roomId);
  }

  /** REST token — used server-side to create rooms via VideoSDK API. */
  generateCrawlerToken(): string {
    return this.signToken(['crawler']);
  }

  /** JWT for callee / participant joining an existing meeting. */
  generateToken(roomId?: string): { token: string } {
    return { token: this.generateRtcToken(roomId) };
  }

  /**
   * Creates a VideoSDK room and returns an RTC JWT + `roomId` as `meetingId`.
   * Joining with a random UUID without creating a room causes SDK errors.
   */
  async createRoomAndToken(): Promise<{ token: string; meetingId: string }> {
    const crawlerToken = this.generateCrawlerToken();
    const res = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: {
        Authorization: crawlerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const raw = await res.text();
    if (!res.ok) {
      const hint =
        res.status === 401
          ? ' Check VIDEOSDK_API_KEY and VIDEOSDK_SECRET match your VideoSDK dashboard.'
          : '';
      throw new BadRequestException(
        `VideoSDK room create failed (${res.status}): ${raw.slice(0, 500)}.${hint}`,
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

    return {
      token: this.generateRtcToken(meetingId),
      meetingId,
    };
  }
}
