import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { OnboardingDto } from './dto/onboarding-dto';
import { UpdateProfileDto } from './dto/update-profile-dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  // ===== SEARCH =====
  @HttpCode(HttpStatus.OK)
  @Get('search')
  search_profiles(
    @CurrentUser('sub') userId: string,
    @Query('q') query: string,
  ) {
    return this.userService.search_profiles(userId, query ?? '');
  }

  // ===== PROFILE =====
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  get_profile(@CurrentUser('sub') userId: string) {
    return this.userService.get_profile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('account-status')
  get_account_status(@CurrentUser('sub') userId: string) {
    return this.authService.getAccountStatus(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('profile/:userId')
  get_user_profile(@Param('userId') userId: string) {
    return this.userService.get_profile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('onboarding')
  onboarding(
    @Body() onboardingDto: OnboardingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.userService.create_user_profile(userId, onboardingDto);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('profile')
  update_profile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.userService.update_profile(userId, updateProfileDto);
  }

  // ===== FOLLOW SYSTEM =====
  @HttpCode(HttpStatus.OK)
  @Post('follow/:targetUserId')
  follow(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.userService.follow(userId, targetUserId);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('follow/:targetUserId')
  unfollow(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
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

  @HttpCode(HttpStatus.OK)
  @Get(':userId/followers')
  get_user_followers(@Param('userId') userId: string) {
    return this.userService.get_followers(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':userId/following')
  get_user_following(@Param('userId') userId: string) {
    return this.userService.get_following(userId);
  }

  // ===== CLOUDINARY =====
  @HttpCode(HttpStatus.OK)
  @Get('cloudinary-upload-signature')
  cloudinary_upload_signature(
    @CurrentUser('sub') userId: string,
    @Query('context') context?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.userService.cloudinary_upload_signature(userId, {
      context,
      resourceType,
    });
  }

  // ===== SUGGESTIONS =====
  @HttpCode(HttpStatus.OK)
  @Get('suggestions')
  suggest_people(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.userService.suggest_people(
      userId,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }
}