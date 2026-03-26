import { Controller, HttpCode, HttpStatus, Post, Get, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { OnboardingDto } from './dto/onboarding-dto';
import { CurrentUser } from '../nestjs/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(HttpStatus.OK)
  @Get('profile')
  get_profile(@CurrentUser('sub') userId: string) {
    return this.userService.get_profile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('onboarding')
  onboarding(@Body() onboardingDto: OnboardingDto, @CurrentUser('sub') userId: string) {
    return this.userService.create_user_profile(userId, onboardingDto);
  }
}
