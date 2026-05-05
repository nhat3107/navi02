import { Controller } from '@nestjs/common';
import { UserServiceService } from './user-service.service';
import { EventPattern, MessagePattern, Transport } from '@nestjs/microservices';

@Controller()
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @MessagePattern('user.get_profile', Transport.KAFKA)
  get_profile(data: any): Promise<any> {
    return this.userServiceService.get_profile(data);
  }

  @MessagePattern('user.create_profile', Transport.KAFKA)
  create_user_profile(data: any): Promise<any> {
    return this.userServiceService.create_user_profile(data);
  }

  @MessagePattern('user.update_profile', Transport.KAFKA)
  update_profile(data: any): Promise<any> {
    return this.userServiceService.update_profile(data);
  }

  @MessagePattern('user.follow', Transport.KAFKA)
  follow(data: any): Promise<any> {
    return this.userServiceService.follow(data);
  }

  @MessagePattern('user.unfollow', Transport.KAFKA)
  unfollow(data: any): Promise<any> {
    return this.userServiceService.unfollow(data);
  }

  @MessagePattern('user.get_followers', Transport.KAFKA)
  get_followers(data: any): Promise<any> {
    return this.userServiceService.get_followers(data);
  }

  @MessagePattern('user.get_following', Transport.KAFKA)
  get_following(data: any): Promise<any> {
    return this.userServiceService.get_following(data);
  @MessagePattern('user.search_profiles', Transport.KAFKA)
  search_profiles(data: any): Promise<any> {
    return this.userServiceService.search_profiles(data);
  }

  @MessagePattern('user.lookup_profiles', Transport.KAFKA)
  lookup_profiles(data: any): Promise<any> {
    return this.userServiceService.lookup_profiles(data);
  }

  @MessagePattern('user.cloudinary_upload_signature', Transport.KAFKA)
  cloudinary_upload_signature(data: {
    userId: string;
    context?: string;
    resourceType?: string;
  }): Promise<any> {
    return this.userServiceService.cloudinary_upload_signature(data);
  }

  @EventPattern('auth.user_created', Transport.KAFKA)
  send_otp2email(data: any): void {
    this.userServiceService.send_otp2email(data);
  }

  @EventPattern('auth.forgot_password', Transport.KAFKA)
  send_reset_email(data: any): void {
    this.userServiceService.send_reset_email(data);
  }
}
