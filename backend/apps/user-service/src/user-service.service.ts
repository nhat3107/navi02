import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { v2 as cloudinary } from 'cloudinary';
import * as nodemailer from 'nodemailer';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserServiceService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly prismaService: PrismaService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async get_profile(data: any): Promise<any> {
    try {
      const profile = await this.prismaService.userProfile.findUnique({
        where: { id: data.userId },
      });

      if (!profile) {
        throw new RpcException({ status: 404, message: 'Profile not found' });
      }

      return { message: 'Profile found', data: profile };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting profile', error);
      throw new RpcException({ status: 500, message: 'Failed to get profile' });
    }
  }

  async create_user_profile(data: any): Promise<any> {
    try {
      const { userId, full_name, gender, date_of_birth, avatar_url, bio } = data;
      const username = String(data.username ?? '')
        .trim()
        .toLowerCase();

      if (!username || !String(full_name ?? '').trim()) {
        throw new RpcException({
          status: 400,
          message: 'full_name and username are required',
        });
      }

      const existingProfile = await this.prismaService.userProfile.findUnique({
        where: { id: userId },
      });
      if (existingProfile) {
        throw new RpcException({ status: 409, message: 'Profile already exists' });
      }

      const existingUsername = await this.prismaService.userProfile.findUnique({
        where: { username },
      });
      if (existingUsername) {
        throw new RpcException({ status: 409, message: 'Username is already taken' });
      }

      this.assertVerifiedCloudinaryAvatarUrl(
        typeof avatar_url === 'string' ? avatar_url : '',
        userId,
      );

      const profile = await this.prismaService.userProfile.create({
        data: {
          id: userId,
          full_name: String(full_name).trim(),
          username,
          gender,
          date_of_birth: new Date(date_of_birth),
          avatar_url: avatar_url || '',
          bio: bio || '',
        },
      });

      return {
        message: 'Profile created successfully',
        data: {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error creating user profile', error);
      throw new RpcException({ status: 500, message: 'Failed to create profile' });
    }
  }

  async update_profile(data: any): Promise<any> {
    try {
      const { userId, ...updates } = data;
      const hasFollowersCount = Object.prototype.hasOwnProperty.call(
        updates,
        'followers_count',
      );
      const hasFollowingCount = Object.prototype.hasOwnProperty.call(
        updates,
        'following_count',
      );

      if (hasFollowersCount || hasFollowingCount) {
        throw new RpcException({
          status: 400,
          message: 'followers_count and following_count cannot be updated directly',
        });
      }

      const profile = await this.prismaService.userProfile.findUnique({
        where: { id: userId },
      });
      if (!profile) {
        throw new RpcException({ status: 404, message: 'Profile not found' });
      }

      if (updates.username && updates.username !== profile.username) {
        const existingUsername = await this.prismaService.userProfile.findUnique({
          where: { username: updates.username },
        });
        if (existingUsername) {
          throw new RpcException({
            status: 409,
            message: 'Username is already taken',
          });
        }
      }

      if (updates.date_of_birth) {
        updates.date_of_birth = new Date(updates.date_of_birth);
      }

      const updated = await this.prismaService.userProfile.update({
        where: { id: userId },
        data: updates,
      });

      return { message: 'Profile updated successfully', data: updated };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error updating user profile', error);
      throw new RpcException({ status: 500, message: 'Failed to update profile' });
    }
  }

  async follow(data: any): Promise<any> {
    try {
      const { userId, targetUserId } = data;

      if (userId === targetUserId) {
        throw new RpcException({
          status: 400,
          message: 'You cannot follow yourself',
        });
      }

      const targetProfile = await this.prismaService.userProfile.findUnique({
        where: { id: targetUserId },
      });
      if (!targetProfile) {
        throw new RpcException({ status: 404, message: 'User not found' });
      }

      const existingFollow = await this.prismaService.userFollow.findUnique({
        where: {
          follower_id_following_id: {
            follower_id: userId,
            following_id: targetUserId,
          },
        },
      });
      if (existingFollow) {
        throw new RpcException({
          status: 409,
          message: 'Already following this user',
        });
      }

      await this.prismaService.$transaction([
        this.prismaService.userFollow.create({
          data: { follower_id: userId, following_id: targetUserId },
        }),
        this.prismaService.userProfile.update({
          where: { id: userId },
          data: { following_count: { increment: 1 } },
        }),
        this.prismaService.userProfile.update({
          where: { id: targetUserId },
          data: { followers_count: { increment: 1 } },
        }),
      ]);

      return { message: 'Followed successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error following user', error);
      throw new RpcException({ status: 500, message: 'Failed to follow user' });
    }
  }

  async unfollow(data: any): Promise<any> {
    try {
      const { userId, targetUserId } = data;

      if (userId === targetUserId) {
        throw new RpcException({
          status: 400,
          message: 'You cannot unfollow yourself',
        });
      }

      const existingFollow = await this.prismaService.userFollow.findUnique({
        where: {
          follower_id_following_id: {
            follower_id: userId,
            following_id: targetUserId,
          },
        },
      });
      if (!existingFollow) {
        throw new RpcException({
          status: 404,
          message: 'You are not following this user',
        });
      }

      await this.prismaService.$transaction([
        this.prismaService.userFollow.delete({
          where: {
            follower_id_following_id: {
              follower_id: userId,
              following_id: targetUserId,
            },
          },
        }),
        this.prismaService.userProfile.update({
          where: { id: userId },
          data: { following_count: { decrement: 1 } },
        }),
        this.prismaService.userProfile.update({
          where: { id: targetUserId },
          data: { followers_count: { decrement: 1 } },
        }),
      ]);

      return { message: 'Unfollowed successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error unfollowing user', error);
      throw new RpcException({ status: 500, message: 'Failed to unfollow user' });
    }
  }

  async get_followers(data: any): Promise<any> {
    try {
      const { userId } = data;

      const followers = await this.prismaService.userFollow.findMany({
        where: { following_id: userId },
        select: {
          createdAt: true,
          follower: {
            select: {
              id: true,
              username: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        message: 'Followers retrieved successfully',
        data: followers.map((f) => ({ ...f.follower, followed_at: f.createdAt })),
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting followers', error);
      throw new RpcException({ status: 500, message: 'Failed to get followers' });
    }
  }

  async get_following(data: any): Promise<any> {
    try {
      const { userId } = data;

      const following = await this.prismaService.userFollow.findMany({
        where: { follower_id: userId },
        select: {
          createdAt: true,
          following: {
            select: {
              id: true,
              username: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        message: 'Following retrieved successfully',
        data: following.map((f) => ({ ...f.following, followed_at: f.createdAt })),
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error getting following', error);
      throw new RpcException({ status: 500, message: 'Failed to get following' });
    }
  }

  async search_profiles(data: {
    userId: string;
    query: string;
    limit?: number;
  }): Promise<any> {
    try {
      const raw = data.query?.trim() ?? '';
      if (raw.length < 2) {
        throw new RpcException({
          status: 400,
          message: 'Search query must be at least 2 characters',
        });
      }
      const limit = Math.min(Math.max(data.limit ?? 15, 1), 30);
      const profiles = await this.prismaService.userProfile.findMany({
        where: {
          id: { not: data.userId },
          OR: [
            { username: { contains: raw, mode: 'insensitive' } },
            { full_name: { contains: raw, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          username: true,
          full_name: true,
          avatar_url: true,
        },
      });
      return { message: 'ok', data: profiles };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error searching profiles', error);
      throw new RpcException({ status: 500, message: 'Search failed' });
    }
  }

  async lookup_profiles(data: { ids: string[] }): Promise<any> {
    try {
      const raw = [...new Set((data.ids ?? []).map((x) => `${x}`.trim()))].filter(
        Boolean,
      );
      const ids = raw.slice(0, 200);
      if (ids.length === 0) {
        return { message: 'ok', data: [] };
      }
      const profiles = await this.prismaService.userProfile.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, full_name: true, avatar_url: true },
      });
      return { message: 'ok', data: profiles };
    } catch (error) {
      console.error('Error lookup_profiles', error);
      throw new RpcException({ status: 500, message: 'Lookup failed' });
    }
  }

  /**
   * Kafka: one-shot signed upload params. Browser POSTs file + signature to Cloudinary.
   * context=chat → CLOUDINARY_CHAT_FOLDER (default navi/chat);
   * context=network → CLOUDINARY_NETWORK_FOLDER (default navi/network);
   * else onboarding folder.
   * resourceType=video → /video/upload (do not put resource_type in signature; Cloudinary
   * derives it from the URL).
   */
  async cloudinary_upload_signature(data: {
    userId: string;
    context?: string;
    resourceType?: string;
  }): Promise<{
    message: string;
    data: {
      cloudName: string;
      apiKey: string;
      timestamp: number;
      signature: string;
      folder: string;
      public_id: string;
      uploadUrl: string;
      resourceType: 'image' | 'video';
    };
  }> {
    const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
    if (!userId) {
      throw new RpcException({ status: 400, message: 'User id is required' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      throw new RpcException({
        status: 503,
        message: 'Media upload is not configured',
      });
    }

    const ctxNorm = (data.context ?? '').trim().toLowerCase();
    const ctx =
      ctxNorm === 'chat'
        ? 'chat'
        : ctxNorm === 'network'
          ? 'network'
          : 'onboarding';
    const rt =
      typeof data.resourceType === 'string' &&
      data.resourceType.trim().toLowerCase() === 'video'
        ? 'video'
        : 'image';

    const folderBase =
      ctx === 'chat'
        ? process.env.CLOUDINARY_CHAT_FOLDER?.trim() || 'navi/chat'
        : ctx === 'network'
          ? process.env.CLOUDINARY_NETWORK_FOLDER?.trim() || 'navi/network'
          : process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'navi/onboarding';

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `${folderBase.replace(/^\/+|\/+$/g, '')}/${userId}`;
    const idPrefix =
      ctx === 'chat' ? 'chat' : ctx === 'network' ? 'network' : 'onboard';
    const public_id = `${idPrefix}_${timestamp}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
      public_id,
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    const uploadPath = rt === 'video' ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${uploadPath}/upload`;

    return {
      message: 'ok',
      data: {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        public_id,
        uploadUrl,
        resourceType: rt,
      },
    };
  }

  /**
   * Onboarding: accept only our Cloudinary delivery URLs under the signed folder + user id.
   */
  private assertVerifiedCloudinaryAvatarUrl(
    avatarUrl: string,
    userId: string,
  ): void {
    const raw = avatarUrl.trim();
    if (!raw) return;

    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const folderBase = (
      process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'navi/onboarding'
    ).replace(/^\/+|\/+$/g, '');
    if (!cloud) {
      throw new RpcException({
        status: 503,
        message: 'Avatar verification is not configured (CLOUDINARY_CLOUD_NAME)',
      });
    }

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new RpcException({ status: 400, message: 'Invalid avatar URL' });
    }
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
      throw new RpcException({ status: 400, message: 'Invalid avatar URL' });
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (
      segments.length < 4 ||
      segments[0] !== cloud ||
      segments[1] !== 'image' ||
      segments[2] !== 'upload'
    ) {
      throw new RpcException({
        status: 400,
        message: 'Avatar must be a Cloudinary delivery URL for this app',
      });
    }

    const pathAfterUpload = decodeURIComponent(segments.slice(3).join('/'));
    const folderNorm = folderBase.split('/').join('/');
    if (!pathAfterUpload.includes(`${folderNorm}/`)) {
      throw new RpcException({
        status: 400,
        message: 'Avatar is not under the allowed upload folder',
      });
    }
    if (
      !pathAfterUpload.includes(`/${userId}/`) &&
      !pathAfterUpload.startsWith(`${userId}/`)
    ) {
      throw new RpcException({
        status: 400,
        message: 'Avatar must be uploaded for this user account',
      });
    }
  }

  async send_otp2email(data: any): Promise<void> {
    try {
      const { email, otp } = data;

      await this.transporter.sendMail({
        from: `"Navi" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your one-time verification code is:</p>
            <div style="background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a73e8;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 15 minutes. Do not share it with anyone.</p>
          </div>
        `,
      });

      console.log(`OTP email sent to ${email}`);
      console.log(`OTP: ${otp}`);
    } catch (error) {
      console.error('Error sending OTP to email', error);
    }
  }

  async send_reset_email(data: any): Promise<void> {
    try {
      const { email, resetToken } = data;
      const base = (process.env.FRONTEND_URL ?? '').replace(/\/+$/, '');
      const resetLink = `${base}/reset-password?token=${encodeURIComponent(resetToken)}`;

      await this.transporter.sendMail({
        from: `"Navi" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset Your Password',
        html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;font-family:Arial,sans-serif;">

                <!-- Logo -->
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <h2 style="margin:0;color:#2b6cb0;">Navi</h2>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td align="center">
                    <h3 style="margin:0 0 20px;">Reset your password</h3>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="color:#555;font-size:14px;line-height:1.6;text-align:center;">
                    You recently requested to reset your password. Click the button below to proceed.
                    This link will expire in <strong>24 hours</strong>.
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding:30px 0;">
                    <a href="${resetLink}"
                      style="background:#3182ce;color:#ffffff;padding:12px 24px;
                              text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                      Reset Password
                    </a>
                  </td>
                </tr>

                <!-- Fallback -->
                <tr>
                  <td style="font-size:13px;color:#777;text-align:center;">
                    If you didn't request this, you can safely ignore this email.
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding-top:30px;font-size:12px;color:#aaa;text-align:center;">
                    © 2026 Navi. All rights reserved.
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
        `,
      });

      console.log(`Reset password email sent to ${email}`);
    } catch (error) {
      console.error('Error sending reset email', error);
    }
  }
}
