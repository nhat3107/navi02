import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), 'apps/api-gateway/.env') });

function present(v: string | undefined): boolean {
  return Boolean(v?.trim());
}

export function isGoogleOAuthConfigured(): boolean {
  return (
    present(process.env.GOOGLE_CLIENT_ID) &&
    present(process.env.GOOGLE_CLIENT_SECRET) &&
    present(process.env.GOOGLE_CALLBACK_URL)
  );
}

export function isGithubOAuthConfigured(): boolean {
  return (
    present(process.env.GITHUB_CLIENT_ID) &&
    present(process.env.GITHUB_CLIENT_SECRET) &&
    present(process.env.GITHUB_CALLBACK_URL)
  );
}
