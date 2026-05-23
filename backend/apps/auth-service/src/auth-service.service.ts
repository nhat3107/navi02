import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcryptjs from 'bcryptjs';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import {
  normalizeCategoryThresholds,
  clampThreshold,
  type CategoryThresholds,
} from './moderation-categories';

const REFRESH_TOKEN_ROUNDS = 10;

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
    private readonly jwtService: JwtService,
  ) {}

  private async hashRefreshToken(rawToken: string): Promise<string> {
    return bcryptjs.hash(rawToken, REFRESH_TOKEN_ROUNDS);
  }

  /**
   * Refresh tokens are bcrypt-hashed at rest; look up candidates and compare.
   * We only scan non-expired rows, newest first, capped for safety.
   */
  private async findStoredRefreshToken(rawToken: string) {
    const candidates = await this.prismaService.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    for (const row of candidates) {
      // Backward compatibility: accept legacy plaintext rows created before
      // hashing was introduced, so active sessions can rotate seamlessly.
      if (row.token_hash === rawToken) return row;
      try {
        const ok = await bcryptjs.compare(rawToken, row.token_hash);
        if (ok) return row;
      } catch {
        // Not a bcrypt hash (or malformed) — ignore this row.
      }
    }
    return null;
  }

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
          throw new RpcException({
            status: 403,
            message: `Account is temporarily blocked until ${user.block_until.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}`,
          });
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
      const refreshTokenHash = await this.hashRefreshToken(refreshToken);

      await this.prismaService.refreshToken.create({
        data: {
          token_hash: refreshTokenHash,
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

  /** Admin panel login — username is the account email; role must be `admin`. */
  async adminSignin(data: {
    username?: string;
    password?: string;
  }): Promise<{ accessToken: string }> {
    try {
      const email =
        typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
      const password = typeof data.password === 'string' ? data.password : '';

      if (!email || !password) {
        throw new RpcException({
          status: 400,
          message: 'Username and password are required',
        });
      }

      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user || user.role !== 'admin') {
        throw new RpcException({
          status: 401,
          message: 'Invalid username or password',
        });
      }

      if (user.account_status === 'blocked') {
        if (user.block_until && new Date() < user.block_until) {
          throw new RpcException({
            status: 403,
            message: 'Account is temporarily blocked',
          });
        }
        await this.prismaService.user.update({
          where: { email },
          data: { account_status: 'active', block_until: null },
        });
      }

      const isMatch = await bcryptjs.compare(password, user.hash_password);
      if (!isMatch) {
        throw new RpcException({
          status: 401,
          message: 'Invalid username or password',
        });
      }

      const accessToken = await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return { accessToken };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error admin sign in', error);
      throw new RpcException({ status: 500, message: 'Failed to sign in' });
    }
  }

  async refresh(data: any): Promise<any> {
    try {
      const { refreshToken } = data;

      if (!refreshToken) {
        throw new RpcException({ status: 401, message: 'Refresh token is required' });
      }

      const tokenRecord = await this.findStoredRefreshToken(refreshToken);

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
      const newRefreshTokenHash =
        await this.hashRefreshToken(newRefreshToken);

      await this.prismaService.refreshToken.create({
        data: {
          token_hash: newRefreshTokenHash,
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
    const resetSecret = process.env.JWT_RESET_SECRET?.trim();
    if (!resetSecret) {
      console.error('JWT_RESET_SECRET is not set');
      throw new RpcException({
        status: 500,
        message: 'Password reset is not configured on the server',
      });
    }

    const emailRaw =
      typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      throw new RpcException({ status: 400, message: 'A valid email is required' });
    }

    const genericOk = {
      message:
        'If an account exists for this email, you will receive reset instructions shortly.',
    };

    try {
      const user = await this.prismaService.user.findUnique({
        where: { email: emailRaw },
      });

      if (!user) {
        return genericOk;
      }

      if (!user.isEmailVerified) {
        return genericOk;
      }

      const resetToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, purpose: 'password_reset' },
        { secret: resetSecret, expiresIn: '24h' },
      );

      this.kafkaclient.emit('auth.forgot_password', {
        email: user.email,
        resetToken,
      });

      return genericOk;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error in forget password', error);
      throw new RpcException({ status: 500, message: 'Failed to process forget password request' });
    }
  }

  async reset_passwd(data: any): Promise<any> {
    const resetSecret = process.env.JWT_RESET_SECRET?.trim();
    if (!resetSecret) {
      throw new RpcException({
        status: 500,
        message: 'Password reset is not configured on the server',
      });
    }

    const token = typeof data.token === 'string' ? data.token.trim() : '';
    const newPassword = data.newPassword ?? data.new_password;

    if (!token) {
      throw new RpcException({ status: 400, message: 'Reset token is required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new RpcException({
        status: 400,
        message: 'Password must be at least 8 characters',
      });
    }
    if (newPassword.length > 128) {
      throw new RpcException({ status: 400, message: 'Password is too long' });
    }

    try {
      let payload: { sub: string; purpose?: string };
      try {
        payload = await this.jwtService.verifyAsync<{ sub: string; purpose?: string }>(
          token,
          { secret: resetSecret },
        );
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

  async oauthLogin(data: { provider: string; providerId: string; email: string }): Promise<any> {
    try {
      const { provider, providerId, email } = data;
      const providerIdField = provider === 'google' ? 'googleId' : 'githubId';

      let user = await this.prismaService.user.findFirst({
        where: { [providerIdField]: providerId },
      });

      if (!user) {
        user = await this.prismaService.user.findUnique({
          where: { email },
        });

        if (user) {
          user = await this.prismaService.user.update({
            where: { id: user.id },
            data: { [providerIdField]: providerId },
          });
        }
      }

      if (!user) {
        user = await this.prismaService.user.create({
          data: {
            email,
            hash_password: '',
            role: 'user',
            isEmailVerified: true,
            auth_provider: provider,
            [providerIdField]: providerId,
          },
        });

        this.kafkaclient.emit('auth.user_created_oauth', {
          userId: user.id,
          email: user.email,
          provider,
        }); // ????? 
      }

      if (user.account_status === 'blocked') {
        if (user.block_until && new Date() < user.block_until) {
          throw new RpcException({
            status: 403,
            message: `Account is temporarily blocked until ${user.block_until.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}`,
          });
        }
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { account_status: 'active', block_until: null },
        });
      }

      await this.prismaService.refreshToken.deleteMany({
        where: { userId: user.id },
      });

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
      );

      const refreshToken = randomBytes(64).toString('hex');
      const refreshTokenHash = await this.hashRefreshToken(refreshToken);

      await this.prismaService.refreshToken.create({
        data: {
          token_hash: refreshTokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error in OAuth login', error);
      throw new RpcException({ status: 500, message: 'Failed to complete OAuth login' });
    }
  }

  async signout(data: any): Promise<any> {
    try {
      const { refreshToken } = data;

      if (!refreshToken) {
        throw new RpcException({ status: 400, message: 'Refresh token is required' });
      }

      const tokenRecord = await this.findStoredRefreshToken(refreshToken);
      if (!tokenRecord) {
        throw new RpcException({ status: 400, message: 'Invalid or already revoked token' });
      }
      await this.prismaService.refreshToken.delete({
        where: { id: tokenRecord.id },
      });

      return { message: 'Signed out successfully' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error signing out', error);
      throw new RpcException({ status: 500, message: 'Failed to sign out' });
    }
  }

  async getAdminDashboardStats(): Promise<{
    totalUsers: number;
    blockedUsers: number;
  }> {
    const memberWhere = { role: { not: 'admin' as const } };
    const [totalUsers, blockedUsers] = await Promise.all([
      this.prismaService.user.count({ where: memberWhere }),
      this.prismaService.user.count({
        where: { ...memberWhere, account_status: 'blocked' },
      }),
    ]);
    return { totalUsers, blockedUsers };
  }

  async getAccountStatus(userId: string): Promise<{ data: unknown }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        violationCount: true,
        account_status: true,
        block_until: true,
        postBlockUntil: true,
      },
    });
    if (!user) {
      throw new RpcException({ status: 404, message: 'User not found' });
    }
    return { data: this.formatAccountStatus(user) };
  }

  async checkPostingAllowed(userId: string): Promise<{
    allowed: boolean;
    message?: string;
  }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return { allowed: false, message: 'User not found' };
    }
    if (user.account_status === 'blocked') {
      if (user.block_until && new Date() < user.block_until) {
        return {
          allowed: false,
          message: 'Your account is temporarily blocked',
        };
      }
      await this.prismaService.user.update({
        where: { id: userId },
        data: { account_status: 'active', block_until: null },
      });
    }
    if (user.postBlockUntil && new Date() < user.postBlockUntil) {
      return {
        allowed: false,
        message: 'You cannot create posts until your posting restriction ends',
      };
    }
    return { allowed: true };
  }

  async applyViolationPenalty(userId: string): Promise<{
    violationCount: number;
    message: string;
  }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new RpcException({ status: 404, message: 'User not found' });
    }

    const violationCount = user.violationCount + 1;
    const now = new Date();
    let message = '';

    if (violationCount <= 3) {
      message =
        'Warning: your content violated community guidelines. Further violations may restrict your account.';
      await this.prismaService.user.update({
        where: { id: userId },
        data: { violationCount },
      });
      this.kafkaclient.emit('notification.penalty', {
        recipientId: userId,
        preview: message,
      });
      return { violationCount, message };
    } else if (violationCount === 4) {
      const postBlockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await this.prismaService.user.update({
        where: { id: userId },
        data: { violationCount, postBlockUntil },
      });
      message = 'You cannot post for 1 day due to repeated policy violations.';
      this.kafkaclient.emit('notification.penalty', {
        recipientId: userId,
        preview: message,
      });
      return { violationCount, message };
    } else if (violationCount === 5) {
      const postBlockUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      await this.prismaService.user.update({
        where: { id: userId },
        data: { violationCount, postBlockUntil },
      });
      message = 'You cannot post for 3 days due to repeated policy violations.';
      this.kafkaclient.emit('notification.penalty', {
        recipientId: userId,
        preview: message,
      });
      return { violationCount, message };
    }

    const blockUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        violationCount,
        account_status: 'blocked',
        block_until: blockUntil,
      },
    });
    message =
      'Your account has been blocked for 7 days due to repeated policy violations.';
    this.kafkaclient.emit('notification.penalty', {
      recipientId: userId,
      preview: message,
    });
    return { violationCount, message };
  }

  async listUsersForAdmin(data: {
    limit?: number;
    skip?: number;
  }): Promise<{ data: unknown[]; total: number }> {
    const limit = Math.min(Math.max(data.limit ?? 20, 1), 100);
    const skip = Math.max(data.skip ?? 0, 0);

    const where = { role: { not: 'admin' as const } };
    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          email: true,
          role: true,
          account_status: true,
          block_until: true,
          postBlockUntil: true,
          violationCount: true,
          createdAt: true,
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      total,
      data: users.map((u) => this.formatAdminUser(u)),
    };
  }

  async listAdminsForAdmin(): Promise<{
    data: { id: string; email: string; createdAt: string }[];
    total: number;
  }> {
    const where = { role: 'admin' as const };
    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      total,
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  async createAdminUserForAdmin(data: {
    email: string;
    password: string;
  }): Promise<{ message: string; data: { id: string; email: string } }> {
    const email = data.email?.trim().toLowerCase();
    const password = data.password?.trim();

    if (!email || !email.includes('@')) {
      throw new RpcException({ status: 400, message: 'Valid email is required' });
    }
    if (!password || password.length < 8) {
      throw new RpcException({
        status: 400,
        message: 'Password must be at least 8 characters',
      });
    }

    const hash_password = await bcryptjs.hash(password, 10);

    const user = await this.prismaService.user.upsert({
      where: { email },
      create: {
        email,
        hash_password,
        role: 'admin',
        isEmailVerified: true,
        auth_provider: 'email',
        account_status: 'active',
      },
      update: {
        hash_password,
        role: 'admin',
        isEmailVerified: true,
        account_status: 'active',
        block_until: null,
      },
      select: { id: true, email: true, role: true },
    });

    if (user.role !== 'admin') {
      throw new RpcException({ status: 500, message: 'Failed to create admin user' });
    }

    return {
      message: 'Admin account ready',
      data: { id: user.id, email: user.email },
    };
  }

  async blockUserForAdmin(
    userId: string,
    blockedUntil?: string,
    blockDays?: number,
  ): Promise<unknown> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new RpcException({ status: 404, message: 'User not found' });
    }
    if (user.role === 'admin') {
      throw new RpcException({ status: 403, message: 'Cannot block admin accounts' });
    }

    let until: Date;
    if (blockedUntil) {
      until = new Date(blockedUntil);
      if (Number.isNaN(until.getTime())) {
        throw new RpcException({ status: 400, message: 'Invalid blockedUntil timestamp' });
      }
    } else {
      const days = blockDays && blockDays > 0 ? blockDays : 7;
      until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    await this.prismaService.refreshToken.deleteMany({ where: { userId } });
    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: { account_status: 'blocked', block_until: until },
      select: {
        id: true,
        email: true,
        role: true,
        account_status: true,
        block_until: true,
        postBlockUntil: true,
        violationCount: true,
        createdAt: true,
      },
    });

    return { message: 'User blocked', data: this.formatAdminUser(updated) };
  }

  async unblockUserForAdmin(userId: string): Promise<unknown> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new RpcException({ status: 404, message: 'User not found' });
    }

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        account_status: 'active',
        block_until: null,
        postBlockUntil: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        account_status: true,
        block_until: true,
        postBlockUntil: true,
        violationCount: true,
        createdAt: true,
      },
    });

    return { message: 'User unblocked', data: this.formatAdminUser(updated) };
  }

  async resetViolationPenaltyForAdmin(userId: string): Promise<unknown> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new RpcException({ status: 404, message: 'User not found' });
    }
    if (user.role === 'admin') {
      throw new RpcException({
        status: 403,
        message: 'Cannot reset penalty for admin accounts',
      });
    }

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        violationCount: 0,
        postBlockUntil: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        account_status: true,
        block_until: true,
        postBlockUntil: true,
        violationCount: true,
        createdAt: true,
      },
    });

    return {
      message: 'Violation penalty reset',
      data: this.formatAdminUser(updated),
    };
  }

  async getAiModerationConfig(): Promise<{
    enabled: boolean;
    temperature: number;
    categoryThresholds: Record<string, number>;
    updatedAt: string;
  }> {
    let row = await this.prismaService.aiModerationSetting.findUnique({
      where: { id: 'default' },
    });
    if (!row) {
      row = await this.prismaService.aiModerationSetting.create({
        data: {
          id: 'default',
          enabled: true,
          temperature: 0.5,
          categoryThresholds: {},
        },
      });
    }
    const categoryThresholds = normalizeCategoryThresholds(
      row.categoryThresholds,
      row.temperature,
    );
    return {
      enabled: row.enabled,
      temperature: row.temperature,
      categoryThresholds,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateAiModerationConfig(data: {
    enabled?: boolean;
    temperature?: number;
    categoryThresholds?: CategoryThresholds;
  }): Promise<{
    enabled: boolean;
    temperature: number;
    categoryThresholds: Record<string, number>;
    updatedAt: string;
  }> {
    const existing = await this.prismaService.aiModerationSetting.findUnique({
      where: { id: 'default' },
    });
    const baseTemp =
      typeof data.temperature === 'number'
        ? clampThreshold(data.temperature)
        : (existing?.temperature ?? 0.5);

    const mergedThresholds = normalizeCategoryThresholds(
      data.categoryThresholds ?? existing?.categoryThresholds ?? {},
      baseTemp,
    );

    const row = await this.prismaService.aiModerationSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        enabled: data.enabled ?? true,
        temperature: baseTemp,
        categoryThresholds: mergedThresholds,
      },
      update: {
        ...(typeof data.enabled === 'boolean' ? { enabled: data.enabled } : {}),
        ...(typeof data.temperature === 'number'
          ? { temperature: baseTemp }
          : {}),
        ...(data.categoryThresholds !== undefined
          ? { categoryThresholds: mergedThresholds }
          : {}),
      },
    });

    return {
      enabled: row.enabled,
      temperature: row.temperature,
      categoryThresholds: normalizeCategoryThresholds(
        row.categoryThresholds,
        row.temperature,
      ),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private formatAccountStatus(user: {
    violationCount: number;
    account_status: string;
    block_until: Date | null;
    postBlockUntil: Date | null;
  }) {
    const now = new Date();
    const accountBlocked =
      user.account_status === 'blocked' &&
      user.block_until !== null &&
      now < user.block_until;
    const postBlocked =
      user.postBlockUntil !== null && now < user.postBlockUntil;
    const violationLevel = this.violationLevelLabel(user.violationCount);
    const canPost = !accountBlocked && !postBlocked;

    let summaryMessage = 'Your account is in good standing.';
    if (accountBlocked && user.block_until) {
      summaryMessage = `Your account is blocked until ${user.block_until.toLocaleString()}.`;
    } else if (postBlocked && user.postBlockUntil) {
      summaryMessage = `You cannot create new posts until ${user.postBlockUntil.toLocaleString()}.`;
    } else if (user.violationCount > 0 && user.violationCount <= 3) {
      summaryMessage =
        'You have policy warnings on your account. Further violations may restrict posting.';
    } else if (user.violationCount > 3) {
      summaryMessage =
        'Your account has repeated policy violations. Posting may be restricted.';
    }

    return {
      violationCount: user.violationCount,
      violationLevel,
      isAccountBlocked: accountBlocked,
      isPostBlocked: postBlocked,
      canPost,
      block_until: user.block_until?.toISOString() ?? null,
      postBlockUntil: user.postBlockUntil?.toISOString() ?? null,
      summaryMessage,
    };
  }

  private formatAdminUser(user: {
    id: string;
    email: string;
    role: string;
    account_status: string;
    block_until: Date | null;
    postBlockUntil: Date | null;
    violationCount: number;
    createdAt: Date;
  }) {
    const now = new Date();
    const accountBlocked =
      user.account_status === 'blocked' &&
      user.block_until !== null &&
      now < user.block_until;
    const postBlocked =
      user.postBlockUntil !== null && now < user.postBlockUntil;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      violationCount: user.violationCount,
      violationLevel: this.violationLevelLabel(user.violationCount),
      block_until: user.block_until?.toISOString() ?? null,
      postBlockUntil: user.postBlockUntil?.toISOString() ?? null,
      isAccountBlocked: accountBlocked,
      isPostBlocked: postBlocked,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private violationLevelLabel(count: number): string {
    if (count <= 0) return 'clean';
    if (count <= 3) return 'warning';
    if (count <= 5) return 'restricted';
    return 'severe';
  }
}
