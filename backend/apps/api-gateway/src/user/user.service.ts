import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { OnboardingDto } from './dto/onboarding-dto';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @Inject('USER_KAFKA_SERVICE') private readonly kafka: ClientKafka,
  ) {}

  onModuleInit() {
    this.kafka.subscribeToResponseOf('user.get_profile');
    this.kafka.subscribeToResponseOf('user.create_profile');
    this.kafka.subscribeToResponseOf('user.search_profiles');
    this.kafka.subscribeToResponseOf('user.lookup_profiles');
    this.kafka.subscribeToResponseOf('user.cloudinary_upload_signature');
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
