import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import { readAccessTokenFromBody } from '../../../shared/constants/tokens';
import type {
  LoginRequest,
  OnboardPayload,
  OnboardApiResponse,
  RegisterRequest,
  SignInResponse,
  SignUpResponse,
  UserProfileResponse,
} from '../types/auth.types';

/** Sign-in sets `refresh_token` cookie; body chỉ có `access_token`. */
export async function signInApi(data: LoginRequest): Promise<{ accessToken: string }> {
  const res = await api.post<SignInResponse>(API_ROUTES.SIGNIN, data);
  const accessToken = readAccessTokenFromBody(res.data);
  if (!accessToken) {
    throw new Error('Sign-in response missing access_token');
  }
  return { accessToken };
}

export async function signUpApi(data: RegisterRequest): Promise<SignUpResponse> {
  const res = await api.post<SignUpResponse>(API_ROUTES.SIGNUP, data);
  return res.data;
}

export async function verifyOtpApi(email: string, otp: string): Promise<void> {
  await api.post(API_ROUTES.VERIFY_OTP, { email, otp });
}

export async function resendOtpApi(email: string): Promise<void> {
  await api.post(API_ROUTES.RESEND_OTP, { email });
}

export async function signOutApi(): Promise<void> {
  await api.post(API_ROUTES.SIGNOUT);
}

export async function getProfileApi(): Promise<UserProfileResponse> {
  const res = await api.get<UserProfileResponse>(API_ROUTES.USER_PROFILE);
  return res.data;
}

export async function onboardingApi(
  payload: OnboardPayload,
): Promise<OnboardApiResponse> {
  const res = await api.post<OnboardApiResponse>(
    API_ROUTES.USER_ONBOARDING,
    payload,
  );
  return res.data;
}

/** Browser redirect — OAuth routes are excluded from global `/api` prefix on gateway. */
export function getOAuthUrl(provider: 'google' | 'github'): string {
  const apiBase = api.defaults.baseURL?.replace(/\/$/, '') ?? '';
  const origin = apiBase.replace(/\/api\/?$/, '');
  const path =
    provider === 'google'
      ? API_ROUTES.OAUTH_GOOGLE
      : API_ROUTES.OAUTH_GITHUB;
  return `${origin}/${path}`;
}
