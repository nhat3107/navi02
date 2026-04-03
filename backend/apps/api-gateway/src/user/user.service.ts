import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { OnboardingDto } from './dto/onboarding-dto';

const USER_KAFKA_RPC = [
    'user.get_profile',
    'user.create_profile',
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
}
