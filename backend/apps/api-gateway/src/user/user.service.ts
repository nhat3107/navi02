import { Inject, Injectable } from '@nestjs/common';
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
] as const;

@Injectable()
export class UserService {
    constructor(
        @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
    ) {}

    onModuleInit() {
        for (const pattern of USER_KAFKA_RPC) {
            this.kafkaclient.subscribeToResponseOf(pattern);
        }
    }

    get_profile(userId: string) {
        return this.kafkaclient.send('user.get_profile', { userId });
    }

    create_user_profile(userId: string, onboardingDto: OnboardingDto) {
        return this.kafkaclient.send('user.create_profile', { userId, ...onboardingDto });
    }

    update_profile(userId: string, updateProfileDto: UpdateProfileDto) {
        return this.kafkaclient.send('user.update_profile', { userId, ...updateProfileDto });
    }

    follow(userId: string, targetUserId: string) {
        return this.kafkaclient.send('user.follow', { userId, targetUserId });
    }

    unfollow(userId: string, targetUserId: string) {
        return this.kafkaclient.send('user.unfollow', { userId, targetUserId });
    }

    get_followers(userId: string) {
        return this.kafkaclient.send('user.get_followers', { userId });
    }

    get_following(userId: string) {
        return this.kafkaclient.send('user.get_following', { userId });
    }
}
