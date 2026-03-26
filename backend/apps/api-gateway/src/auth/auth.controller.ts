import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up-dto';
import { VerifyOtpDto } from './dto/verify-otp-dto';
import { ResendOtpDto } from './dto/resend-otp-dto';
import { SignInDto } from './dto/sign-in-dto';
import { ForgetPasswdDto } from './dto/forget-passwd-dto';
import { ResetPasswdDto } from './dto/reset-passwd-dto';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { Public } from '../nestjs/decorators/public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK) //Đánh dấu status code là 200 thay vì 201 mặc định của NestJS
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
  async signin(@Body() signinDto: SignInDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await firstValueFrom(this.authService.signin(signinDto));

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    const { accessToken, refreshToken: newRefreshToken } = await firstValueFrom(this.authService.refresh(refreshToken));

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('forget-passwd')
  forget_passwd(@Body() forgetPasswdDto: ForgetPasswdDto) {
    return this.authService.forget_passwd(forgetPasswdDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-passwd')
  reset_passwd(@Body() resetPasswdDto: ResetPasswdDto) {
    return this.authService.reset_passwd(resetPasswdDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signout')
  async signout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    const result = await firstValueFrom(this.authService.signout(refreshToken));

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return result;
  }

}
