import { Controller } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { MessagePattern, Transport } from '@nestjs/microservices';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @MessagePattern('auth.signup', Transport.TCP) // Bổ sung Transport.TCP để lắng nghe từ API Gateway vì nếu dùng Kafka client sẽ đợi rất lâu
  signup( data: any): Promise<any> {
    return this.authServiceService.signup(data);
  }

  @MessagePattern('auth.verify_otp', Transport.TCP)
  verify_otp(data: any): Promise<any> {
    return this.authServiceService.verify_otp(data);
  }

  @MessagePattern('auth.resend_otp', Transport.TCP)
  resend_otp(data: any): Promise<any> {
    return this.authServiceService.resend_otp(data);
  }

  @MessagePattern('auth.signin', Transport.TCP)
  signin(data: any): Promise<any> {
    return this.authServiceService.signin(data);
  }

  @MessagePattern('auth.refresh', Transport.TCP)
  refresh(data: any): Promise<any> {
    return this.authServiceService.refresh(data);
  }

  @MessagePattern('auth.forget_passwd', Transport.TCP)
  forget_passwd(data: any): Promise<any> {
    return this.authServiceService.forget_passwd(data);
  }

  @MessagePattern('auth.reset_passwd', Transport.TCP)
  reset_passwd(data: any): Promise<any> {
    return this.authServiceService.reset_passwd(data);
  }

  @MessagePattern('auth.signout', Transport.TCP)
  signout(data: any): Promise<any> {
    return this.authServiceService.signout(data);
  }

  @MessagePattern('auth.oauth_login', Transport.TCP)
  oauthLogin(data: any): Promise<any> {
    return this.authServiceService.oauthLogin(data);
  }
}
