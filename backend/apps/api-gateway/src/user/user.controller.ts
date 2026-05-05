import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { OnboardingDto } from './dto/onboarding-dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(HttpStatus.OK)
  @Get('search')
  search_profiles(
    @CurrentUser('sub') userId: string,
    @Query('q') query: string,
  ) {
    return this.userService.search_profiles(userId, query ?? '');
  }

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
}
