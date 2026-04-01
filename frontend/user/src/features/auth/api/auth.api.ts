import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type {
  LoginRequest,
  OnboardPayload,
  OnboardApiResponse,
  RegisterRequest,
  SignInResponse,
  SignUpResponse,
  UserProfileResponse,
} from '../types/auth.types';

export async function signInApi(data: LoginRequest): Promise<SignInResponse> {
  const res = await api.post<SignInResponse>(API_ROUTES.SIGNIN, data);
  return res.data;
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

export function getOAuthUrl(provider: 'google' | 'github'): string {
  const base = api.defaults.baseURL?.replace(/\/$/, '') ?? '';
  const path =
    provider === 'google'
      ? API_ROUTES.OAUTH_GOOGLE
      : API_ROUTES.OAUTH_GITHUB;
  return `${base}/${path}`;
}
