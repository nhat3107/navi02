import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isGithubOAuthConfigured } from '../../auth/oauth-env';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  override canActivate(context: ExecutionContext) {
    if (!isGithubOAuthConfigured()) {
      throw new ServiceUnavailableException(
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL.',
      );
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
