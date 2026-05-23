import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login-dto';
import type { AccessTokenDto } from './auth.controller';

@Public()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: AdminLoginDto): Promise<AccessTokenDto> {
    const { accessToken } = await firstValueFrom(
      this.authService.adminSignin(body),
    );
    return { access_token: accessToken };
  }
}
