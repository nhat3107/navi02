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

  @MessagePattern('auth.admin_signin', Transport.KAFKA)
  admin_signin(data: any): Promise<any> {
    return this.authServiceService.adminSignin(data);
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

  @MessagePattern('auth.admin.dashboard_stats', Transport.KAFKA)
  adminDashboardStats(): Promise<any> {
    return this.authServiceService.getAdminDashboardStats();
  }

  @MessagePattern('auth.get_account_status', Transport.KAFKA)
  getAccountStatus(data: { userId: string }): Promise<any> {
    return this.authServiceService.getAccountStatus(data.userId);
  }

  @MessagePattern('auth.check_posting_allowed', Transport.KAFKA)
  checkPostingAllowed(data: { userId: string }): Promise<any> {
    return this.authServiceService.checkPostingAllowed(data.userId);
  }

  @MessagePattern('auth.apply_violation_penalty', Transport.KAFKA)
  applyViolationPenalty(data: { userId: string }): Promise<any> {
    return this.authServiceService.applyViolationPenalty(data.userId);
  }

  @MessagePattern('auth.admin.list_users', Transport.KAFKA)
  adminListUsers(data: { limit?: number; skip?: number }): Promise<any> {
    return this.authServiceService.listUsersForAdmin(data);
  }

  @MessagePattern('auth.admin.list_admins', Transport.KAFKA)
  adminListAdmins(): Promise<any> {
    return this.authServiceService.listAdminsForAdmin();
  }

  @MessagePattern('auth.admin.create_admin_user', Transport.KAFKA)
  adminCreateAdminUser(data: { email: string; password: string }): Promise<any> {
    return this.authServiceService.createAdminUserForAdmin(data);
  }

  @MessagePattern('auth.admin.block_user', Transport.KAFKA)
  adminBlockUser(data: {
    userId: string;
    blockedUntil?: string;
    blockDays?: number;
  }): Promise<any> {
    return this.authServiceService.blockUserForAdmin(
      data.userId,
      data.blockedUntil,
      data.blockDays,
    );
  }

  @MessagePattern('auth.admin.unblock_user', Transport.KAFKA)
  adminUnblockUser(data: { userId: string }): Promise<any> {
    return this.authServiceService.unblockUserForAdmin(data.userId);
  }

  @MessagePattern('auth.admin.reset_violation_penalty', Transport.KAFKA)
  adminResetViolationPenalty(data: { userId: string }): Promise<any> {
    return this.authServiceService.resetViolationPenaltyForAdmin(data.userId);
  }

  @MessagePattern('auth.get_ai_moderation_config', Transport.KAFKA)
  getAiModerationConfig(): Promise<any> {
    return this.authServiceService.getAiModerationConfig();
  }

  @MessagePattern('auth.admin.update_ai_config', Transport.KAFKA)
  adminUpdateAiConfig(data: {
    enabled?: boolean;
    temperature?: number;
    categoryThresholds?: Record<string, number>;
  }): Promise<any> {
    return this.authServiceService.updateAiModerationConfig(data);
  }
}
