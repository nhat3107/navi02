import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up-dto';
import { VerifyOtpDto } from './dto/verify-otp-dto';
import { ResendOtpDto } from './dto/resend-otp-dto';
import { SignInDto } from './dto/sign-in-dto';
import { ForgetPasswdDto } from './dto/forget-passwd-dto';
import { ResetPasswdDto } from './dto/reset-passwd-dto';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { GithubAuthGuard } from '../common/guards/github-auth.guard';
import {
  attachRefreshTokenCookie,
  readRefreshTokenCookie,
  clearRefreshTokenCookies,
} from './auth-session.cookies';

/** JSON body: short-lived JWT only. Refresh stays in HttpOnly `refresh_token` cookie. */
export type AccessTokenDto = { access_token: string };

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signup')
  signup(@Body() signupDto: SignUpDto) {
    return this.authService.signup(signupDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  verify_otp(@Body() verify_otpDto: VerifyOtpDto) {
    return this.authService.verify_otp(verify_otpDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  resend_otp(@Body() resend_otpDto: ResendOtpDto) {
    return this.authService.resend_otp(resend_otpDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signin(
    @Body() signinDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    const { accessToken, refreshToken } = await firstValueFrom(
      this.authService.signin(signinDto),
    );
    attachRefreshTokenCookie(res, refreshToken, 'strict');
    return { access_token: accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    const refreshToken = readRefreshTokenCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const { accessToken, refreshToken: rotated } = await firstValueFrom(
      this.authService.refresh(refreshToken),
    );
    attachRefreshTokenCookie(res, rotated, 'strict');
    return { access_token: accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('forget-passwd')
  forget_passwd(@Body() body: ForgetPasswdDto & { email?: string }) {
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    return this.authService.forget_passwd({ email });
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-passwd')
  reset_passwd(
    @Body()
    body: ResetPasswdDto & { new_password?: string; reset_token?: string },
  ) {
    return this.authService.reset_passwd({
      token: body.token ?? body.reset_token ?? '',
      newPassword: body.newPassword ?? body.new_password ?? '',
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('signout')
  async signout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenCookie(req) ?? '';
    const result = await firstValueFrom(
      this.authService.signout(refreshToken),
    );
    clearRefreshTokenCookies(res);
    return result;
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  @Get('github')
  @UseGuards(GithubAuthGuard)
  githubLogin() {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  private resolveOAuthLoginRedirectUrl(): string {
    const loginUrl = process.env.OAUTH_FRONTEND_LOGIN_URL?.trim();
    if (loginUrl) return loginUrl;

    const redirectUrl = process.env.OAUTH_FRONTEND_REDIRECT_URL?.trim();
    if (!redirectUrl) {
      throw new InternalServerErrorException(
        'OAUTH_FRONTEND_REDIRECT_URL is not set',
      );
    }

    const parsed = new URL(redirectUrl);
    parsed.pathname = '/login';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  }

  private redirectOAuthFailure(res: Response, err: unknown) {
    clearRefreshTokenCookies(res);

    const rpcError =
      (err as { error?: { status?: number; message?: string } })?.error ??
      (err as { status?: number; message?: string });
    const status = rpcError?.status;
    const message =
      typeof rpcError?.message === 'string'
        ? rpcError.message
        : 'Sign in failed';

    const loginUrl = new URL(this.resolveOAuthLoginRedirectUrl());
    const blocked =
      status === 403 && /blocked|restricted/i.test(message);
    loginUrl.searchParams.set('oauth_error', blocked ? 'blocked' : 'failed');
    loginUrl.searchParams.set('error_message', message);
    return res.redirect(loginUrl.toString());
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    const oauthUser = req.user as {
      provider: string;
      providerId: string;
      email: string;
    };

    try {
      const { accessToken, refreshToken } = await firstValueFrom(
        this.authService.oauthLogin(oauthUser),
      );
      attachRefreshTokenCookie(res, refreshToken, 'lax');
      const frontendUrl = process.env.OAUTH_FRONTEND_REDIRECT_URL;
      if (!frontendUrl?.trim()) {
        throw new InternalServerErrorException(
          'OAUTH_FRONTEND_REDIRECT_URL is not set',
        );
      }
      const q = `access_token=${encodeURIComponent(accessToken)}`;
      return res.redirect(`${frontendUrl}?${q}`);
    } catch (err) {
      return this.redirectOAuthFailure(res, err);
    }
  }
}
