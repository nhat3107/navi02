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
  CloudinarySignatureData,
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

export async function forgetPasswordApi(email: string): Promise<{ message: string }> {
  const normalized = email.trim().toLowerCase();
  const res = await api.post<{ message: string }>(API_ROUTES.FORGET_PASSWORD, {
    email: normalized,
  });
  return res.data;
}

export async function resetPasswordApi(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>(API_ROUTES.RESET_PASSWORD, {
    token: token.trim(),
    newPassword: newPassword.trim(),
  });
  return res.data;
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

export type CloudinarySignRequestOptions = {
  context?: 'onboarding' | 'chat' | 'network';
  resourceType?: 'image' | 'video';
};

export async function getCloudinaryUploadSignatureApi(
  options?: CloudinarySignRequestOptions,
): Promise<CloudinarySignatureData> {
  const res = await api.get<{
    message: string;
    data: CloudinarySignatureData;
  }>(API_ROUTES.USER_CLOUDINARY_SIGNATURE, {
    params: {
      ...(options?.context ? { context: options.context } : {}),
      ...(options?.resourceType ? { resourceType: options.resourceType } : {}),
    },
  });
  return res.data.data;
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
