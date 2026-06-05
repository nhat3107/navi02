import {
  isGithubOAuthConfigured,
  isGoogleOAuthConfigured,
} from './oauth-env';

describe('oauth-env', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CALLBACK_URL;
    delete process.env.GH_CLIENT_ID;
    delete process.env.GH_CLIENT_SECRET;
    delete process.env.GH_CALLBACK_URL;
  });

  afterAll(() => {
    process.env = env;
  });

  describe('isGoogleOAuthConfigured', () => {
    it('returns false when any value is missing or blank', () => {
      expect(isGoogleOAuthConfigured()).toBe(false);
      process.env.GOOGLE_CLIENT_ID = 'id';
      expect(isGoogleOAuthConfigured()).toBe(false);
      process.env.GOOGLE_CLIENT_SECRET = 'secret';
      process.env.GOOGLE_CALLBACK_URL = '   ';
      expect(isGoogleOAuthConfigured()).toBe(false);
    });

    it('returns true when all values are set', () => {
      process.env.GOOGLE_CLIENT_ID = 'id';
      process.env.GOOGLE_CLIENT_SECRET = 'secret';
      process.env.GOOGLE_CALLBACK_URL = 'https://example.com/callback';
      expect(isGoogleOAuthConfigured()).toBe(true);
    });
  });

  describe('isGithubOAuthConfigured', () => {
    it('returns false when any value is missing or blank', () => {
      expect(isGithubOAuthConfigured()).toBe(false);
      process.env.GH_CLIENT_ID = 'id';
      process.env.GH_CLIENT_SECRET = 'secret';
      expect(isGithubOAuthConfigured()).toBe(false);
    });

    it('returns true when all values are set', () => {
      process.env.GH_CLIENT_ID = 'id';
      process.env.GH_CLIENT_SECRET = 'secret';
      process.env.GH_CALLBACK_URL = 'https://example.com/github/callback';
      expect(isGithubOAuthConfigured()).toBe(true);
    });
  });
});
