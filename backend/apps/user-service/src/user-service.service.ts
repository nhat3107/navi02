import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
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
      const { userId, full_name, username, gender, date_of_birth, avatar_url, bio } = data;

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

      const profile = await this.prismaService.userProfile.create({
        data: {
          id: userId,
          full_name,
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
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

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
                    If you didn’t request this, you can safely ignore this email.
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
