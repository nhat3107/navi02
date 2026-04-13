import { Controller, HttpCode, HttpStatus, Post, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { OnboardingDto } from './dto/onboarding-dto';
import { UpdateProfileDto } from './dto/update-profile-dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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

  @HttpCode(HttpStatus.OK)
  @Patch('profile')
  update_profile(@Body() updateProfileDto: UpdateProfileDto, @CurrentUser('sub') userId: string) {
    return this.userService.update_profile(userId, updateProfileDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('follow/:targetUserId')
  follow(@Param('targetUserId') targetUserId: string, @CurrentUser('sub') userId: string) {
    return this.userService.follow(userId, targetUserId);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('follow/:targetUserId')
  unfollow(@Param('targetUserId') targetUserId: string, @CurrentUser('sub') userId: string) {
    return this.userService.unfollow(userId, targetUserId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('followers')
  get_followers(@CurrentUser('sub') userId: string) {
    return this.userService.get_followers(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('following')
  get_following(@CurrentUser('sub') userId: string) {
    return this.userService.get_following(userId);
  }
}
