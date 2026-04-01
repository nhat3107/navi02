import { Controller } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { MessagePattern, Transport } from '@nestjs/microservices';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @MessagePattern('auth.signup', Transport.KAFKA)
  signup(data: any): Promise<any> {
    return this.authServiceService.signup(data);
  }

  @MessagePattern('auth.verify_otp', Transport.KAFKA)
  verify_otp(data: any): Promise<any> {
    return this.authServiceService.verify_otp(data);
  }

  @MessagePattern('auth.resend_otp', Transport.KAFKA)
  resend_otp(data: any): Promise<any> {
    return this.authServiceService.resend_otp(data);
  }

  @MessagePattern('auth.signin', Transport.KAFKA)
  signin(data: any): Promise<any> {
    return this.authServiceService.signin(data);
  }

  @MessagePattern('auth.refresh', Transport.KAFKA)
  refresh(data: any): Promise<any> {
    return this.authServiceService.refresh(data);
  }

  @MessagePattern('auth.forget_passwd', Transport.KAFKA)
  forget_passwd(data: any): Promise<any> {
    return this.authServiceService.forget_passwd(data);
  }

  @MessagePattern('auth.reset_passwd', Transport.KAFKA)
  reset_passwd(data: any): Promise<any> {
    return this.authServiceService.reset_passwd(data);
  }

  @MessagePattern('auth.signout', Transport.KAFKA)
  signout(data: any): Promise<any> {
    return this.authServiceService.signout(data);
  }

  @MessagePattern('auth.oauth_login', Transport.KAFKA)
  oauthLogin(data: any): Promise<any> {
    return this.authServiceService.oauthLogin(data);
  }
}
