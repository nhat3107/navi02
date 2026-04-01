import { Injectable, Inject } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up-dto';
import { ClientKafka } from '@nestjs/microservices';
import { VerifyOtpDto } from './dto/verify-otp-dto';
import { ResendOtpDto } from './dto/resend-otp-dto';
import { SignInDto } from './dto/sign-in-dto';
import { ForgetPasswdDto } from './dto/forget-passwd-dto';
import { ResetPasswdDto } from './dto/reset-passwd-dto';

/** Patterns handled by auth-service over Kafka (request–reply). */
const AUTH_KAFKA_RPC = [
  'auth.signup',
  'auth.verify_otp',
  'auth.resend_otp',
  'auth.signin',
  'auth.refresh',
  'auth.forget_passwd',
  'auth.reset_passwd',
  'auth.signout',
  'auth.oauth_login',
] as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
  ) {}

  onModuleInit() {
    for (const pattern of AUTH_KAFKA_RPC) {
      this.kafkaclient.subscribeToResponseOf(pattern);
    }
  }

  signup(signupDto: SignUpDto) {
    return this.kafkaclient.send('auth.signup', signupDto);
  }

  verify_otp(verify_otpDto: VerifyOtpDto) {
    return this.kafkaclient.send('auth.verify_otp', verify_otpDto);
  }

  resend_otp(resendOtpDto: ResendOtpDto) {
    return this.kafkaclient.send('auth.resend_otp', resendOtpDto);
  }

  signin(signinDto: SignInDto) {
    return this.kafkaclient.send('auth.signin', signinDto);
  }

  refresh(refreshToken: string) {
    return this.kafkaclient.send('auth.refresh', { refreshToken });
  }

  forget_passwd(forgetPasswdDto: ForgetPasswdDto) {
    return this.kafkaclient.send('auth.forget_passwd', forgetPasswdDto);
  }

  reset_passwd(resetPasswdDto: ResetPasswdDto) {
    return this.kafkaclient.send('auth.reset_passwd', resetPasswdDto);
  }

  signout(refreshToken: string) {
    return this.kafkaclient.send('auth.signout', { refreshToken });
  }

  oauthLogin(oauthData: {
    provider: string;
    providerId: string;
    email: string;
  }) {
    return this.kafkaclient.send('auth.oauth_login', oauthData);
  }
}
