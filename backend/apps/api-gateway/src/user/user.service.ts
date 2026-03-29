import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OnboardingDto } from './dto/onboarding-dto';

@Injectable()
export class UserService {
    constructor(
        @Inject('USER_TCP_SERVICE') private readonly tcpclient: ClientProxy,
    ) {}

    get_profile(userId: string) {
        return this.tcpclient.send('user.get_profile', { userId });
    }

    create_user_profile(userId: string, onboardingDto: OnboardingDto) {
        return this.tcpclient.send('user.create_profile', { userId, ...onboardingDto });
    }
}
