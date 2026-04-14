import { Controller, HttpCode, HttpStatus, Post, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { OnboardingDto } from './dto/onboarding-dto';
import { UpdateProfileDto } from './dto/update-profile-dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(HttpStatus.OK) // Use to get the current user's profile
  @Get('profile')
  get_profile(@CurrentUser('sub') userId: string) {
    return this.userService.get_profile(userId);
  }

  @HttpCode(HttpStatus.OK)  // Use to get the profile of a user other than the current user
  @Get('profile/:userId')
  get_user_profile(@Param('userId') userId: string) {
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

  @HttpCode(HttpStatus.OK) // Use to get the list of followers of a user other than the current user
  @Get(':userId/followers')
  get_user_followers(@Param('userId') userId: string) {
    return this.userService.get_followers(userId);
  }

  @HttpCode(HttpStatus.OK) // Use to get the list of following of a user other than the current user
  @Get(':userId/following')
  get_user_following(@Param('userId') userId: string) {
    return this.userService.get_following(userId);
  }
}
