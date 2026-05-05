import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { OnboardingDto } from './dto/onboarding-dto';
import { UpdateProfileDto } from './dto/update-profile-dto';

const USER_KAFKA_RPC = [
  'user.get_profile',
  'user.create_profile',
  'user.update_profile',
  'user.follow',
  'user.unfollow',
  'user.get_followers',
  'user.get_following',
  'user.search_profiles',
  'user.lookup_profiles',
  'user.cloudinary_upload_signature',
] as const;

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @Inject('USER_KAFKA_SERVICE') private readonly kafka: ClientKafka,
  ) {}

  onModuleInit() {
    for (const pattern of USER_KAFKA_RPC) {
      this.kafka.subscribeToResponseOf(pattern);
    }
  }

  get_profile(userId: string) {
    return this.kafka.send('user.get_profile', { userId });
  }

  create_user_profile(userId: string, onboardingDto: OnboardingDto) {
    return this.kafka.send('user.create_profile', {
      userId,
      ...onboardingDto,
    });
  }

  update_profile(userId: string, updateProfileDto: UpdateProfileDto) {
    return this.kafka.send('user.update_profile', {
      userId,
      ...updateProfileDto,
    });
  }

  follow(userId: string, targetUserId: string) {
    return this.kafka.send('user.follow', { userId, targetUserId });
  }

  unfollow(userId: string, targetUserId: string) {
    return this.kafka.send('user.unfollow', { userId, targetUserId });
  }

  get_followers(userId: string) {
    return this.kafka.send('user.get_followers', { userId });
  }

  get_following(userId: string) {
    return this.kafka.send('user.get_following', { userId });
  }

  search_profiles(userId: string, query: string) {
    return this.kafka.send('user.search_profiles', { userId, query });
  }

  lookup_profiles(ids: string[]) {
    return this.kafka.send('user.lookup_profiles', { ids });
  }

  cloudinary_upload_signature(
    userId: string,
    opts?: { context?: string; resourceType?: string },
  ) {
    return this.kafka.send('user.cloudinary_upload_signature', {
      userId,
      context: opts?.context,
      resourceType: opts?.resourceType,
    });
  }
}