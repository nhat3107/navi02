import { Injectable, Inject } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up-dto';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';
import { VerifyOtpDto } from './dto/verify-otp-dto';
import { ResendOtpDto } from './dto/resend-otp-dto';
import { SignInDto } from './dto/sign-in-dto';
import { ForgetPasswdDto } from './dto/forget-passwd-dto';
import { ResetPasswdDto } from './dto/reset-passwd-dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaclient: ClientKafka,
    @Inject('TCP_SERVICE') private readonly tcpclient: ClientProxy
  ) {}

  onModuleInit() {
    this.kafkaclient.subscribeToResponseOf('auth.get_auths_service');
  }

  signup(signupDto: SignUpDto) {
    return this.tcpclient.send('auth.signup', signupDto);
  }

  verify_otp(verify_otpDto: VerifyOtpDto) {
    return this.tcpclient.send('auth.verify_otp', verify_otpDto);
  }

  resend_otp(resend_otpDto: ResendOtpDto) {
    return this.tcpclient.send('auth.resend_otp', resend_otpDto);
  }

  signin(signinDto: SignInDto) {
    return this.tcpclient.send('auth.signin', signinDto);
  }

  refresh(refreshToken: string) {
    return this.tcpclient.send('auth.refresh', { refreshToken });
  }

  forget_passwd(forgetPasswdDto: ForgetPasswdDto) {
    return this.tcpclient.send('auth.forget_passwd', forgetPasswdDto);
  }

  reset_passwd(resetPasswdDto: ResetPasswdDto) {
    return this.tcpclient.send('auth.reset_passwd', resetPasswdDto);
  }

  signout(refreshToken: string) {
    return this.tcpclient.send('auth.signout', { refreshToken });
  }

  oauthLogin(oauthData: { provider: string; providerId: string; email: string }) {
    return this.tcpclient.send('auth.oauth_login', oauthData);
  }

}
