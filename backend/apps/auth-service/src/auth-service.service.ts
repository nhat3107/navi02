import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcryptjs from 'bcryptjs';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
    private readonly jwtService: JwtService,
  ) {}

  async signup(data: any): Promise<any> {
    try {
      const existing_user = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });
      if (existing_user) {
        throw new RpcException({ status: 409, message: 'User already exists' });
      }

      const hashed_password = await bcryptjs.hash(data.password, 10);

      const user = await this.prismaService.user.create({
        data: {
          email: data.email,
          hash_password: hashed_password,
          role: 'user',
          isEmailVerified: false,
          auth_provider: 'email',
        },
      });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcryptjs.hash(otp, 10);
      await this.prismaService.otp.create({
        data: {
          email: data.email,
          otp_hash: hashedOTP,
          expiry: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      this.kafkaclient.emit('auth.user_created', {
        email: data.email,
        otp: otp,
      });

      return {
        message: 'User created successfully',
        data: {
          userId: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error creating user', error);
      throw new RpcException({ status: 500, message: 'Failed to create user' });
    }
  }

  async verify_otp(data: any): Promise<any> {
    try {
      const otp_record = await this.prismaService.otp.findUnique({
        where: { email: data.email },
      });

      if (!otp_record) {
        throw new RpcException({ status: 400, message: 'OTP not found or already used' });
      }

      if (new Date() > otp_record.expiry) {
        await this.prismaService.otp.delete({ where: { email: data.email } });
        throw new RpcException({ status: 400, message: 'OTP has expired' });
      }

      const isMatch = await bcryptjs.compare(data.otp, otp_record.otp_hash);
      if (!isMatch) {
        throw new RpcException({ status: 400, message: 'Invalid OTP' });
      }

      await this.prismaService.user.update({
        where: { email: data.email },
        data: { isEmailVerified: true },
      });

      await this.prismaService.otp.delete({ where: { email: data.email } });

      return { message: 'Email verified successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error verifying OTP', error);
      throw new RpcException({ status: 500, message: 'Failed to verify OTP' });
    }
  }

  async resend_otp(data: any): Promise<any> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new RpcException({ status: 404, message: 'User not found' });
      }

      if (user.isEmailVerified) {
        throw new RpcException({ status: 400, message: 'Email is already verified' });
      }

      await this.prismaService.otp.deleteMany({
        where: { email: data.email },
      });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcryptjs.hash(otp, 10);
      await this.prismaService.otp.create({
        data: {
          email: data.email,
          otp_hash: hashedOTP,
          expiry: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      this.kafkaclient.emit('auth.user_created', {
        email: data.email,
        otp: otp,
      });

      return { message: 'OTP resent successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error resending OTP', error);
      throw new RpcException({ status: 500, message: 'Failed to resend OTP' });
    }
  }

  async signin(data: any): Promise<any> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new RpcException({ status: 401, message: 'Invalid email or password' });
      }

      if (user.account_status === 'blocked') {
        if (user.block_until && new Date() < user.block_until) {
          throw new RpcException({ status: 403, message: 'Account is temporarily blocked' });
        }
        await this.prismaService.user.update({
          where: { email: data.email },
          data: { account_status: 'active', block_until: null },
        });
      }

      if (!user.isEmailVerified) {
        throw new RpcException({ status: 403, message: 'Email not verified. Please verify your email first.' });
      }

      const isMatch = await bcryptjs.compare(data.password, user.hash_password);
      if (!isMatch) {
        throw new RpcException({ status: 401, message: 'Invalid email or password' });
      }

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
      );

      const refreshToken = randomBytes(64).toString('hex');

      await this.prismaService.refreshToken.create({
        data: {
          token_hash: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error signing in', error);
      throw new RpcException({ status: 500, message: 'Failed to sign in' });
    }
  }

  async refresh(data: any): Promise<any> {
    try {
      const { refreshToken } = data;

      if (!refreshToken) {
        throw new RpcException({ status: 401, message: 'Refresh token is required' });
      }

      const tokenRecord = await this.prismaService.refreshToken.findUnique({
        where: { token_hash: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord) {
        throw new RpcException({ status: 401, message: 'Invalid refresh token' });
      }

      if (new Date() > tokenRecord.expiresAt) {
        await this.prismaService.refreshToken.delete({ where: { id: tokenRecord.id } });
        throw new RpcException({ status: 401, message: 'Refresh token has expired' });
      }

      // Refresh Token Rotation
      await this.prismaService.refreshToken.delete({ where: { id: tokenRecord.id } });

      const { user } = tokenRecord;

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
      );

      const newRefreshToken = randomBytes(64).toString('hex');

      await this.prismaService.refreshToken.create({
        data: {
          token_hash: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      });

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error refreshing token', error);
      throw new RpcException({ status: 500, message: 'Failed to refresh token' });
    }
  }

  async forget_passwd(data: any): Promise<any> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return { message: 'Reset link has been sent to your email.' };
      }

      const resetToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, purpose: 'password_reset' },
        { secret: process.env.JWT_RESET_SECRET, expiresIn: '24h' },
      );

      this.kafkaclient.emit('auth.forgot_password', {
        email: user.email,
        resetToken,
      });

      return { message: 'Reset link has been sent to your email.' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error in forget password', error);
      throw new RpcException({ status: 500, message: 'Failed to process forget password request' });
    }
  }

  async reset_passwd(data: any): Promise<any> {
    try {
      const { token, newPassword } = data;

      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_RESET_SECRET,
        });
      } catch {
        throw new RpcException({ status: 400, message: 'Invalid or expired reset token' });
      }

      if (payload.purpose !== 'password_reset') {
        throw new RpcException({ status: 400, message: 'Invalid reset token' });
      }

      const hashedPassword = await bcryptjs.hash(newPassword, 10);

      await this.prismaService.user.update({
        where: { id: payload.sub },
        data: { hash_password: hashedPassword },
      });

      await this.prismaService.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error resetting password', error);
      throw new RpcException({ status: 500, message: 'Failed to reset password' });
    }
  }

  async signout(data: any): Promise<any> {
    try {
      const { refreshToken } = data;

      if (!refreshToken) {
        throw new RpcException({ status: 400, message: 'Refresh token is required' });
      }

      const deleted = await this.prismaService.refreshToken.deleteMany({
        where: { token_hash: refreshToken },
      });

      if (deleted.count === 0) {
        throw new RpcException({ status: 400, message: 'Invalid or already revoked token' });
      }

      return { message: 'Signed out successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error signing out', error);
      throw new RpcException({ status: 500, message: 'Failed to sign out' });
    }
  }
}
