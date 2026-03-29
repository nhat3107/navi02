import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type { AuthResponse, LoginRequest, OnboardRequest, RegisterRequest } from '../types/auth.types';

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>(API_ROUTES.LOGIN, data);
  return res.data;
}

export async function registerApi(data: RegisterRequest): Promise<void> {
  await api.post(API_ROUTES.REGISTER, data);
}

export async function onboardApi(data: OnboardRequest): Promise<AuthResponse> {
  const formData = new FormData();
  if (data.avatar) formData.append('avatar', data.avatar);
  formData.append('username', data.username);
  formData.append('dob', data.dob);
  formData.append('gender', data.gender);

  const res = await api.post<AuthResponse>(API_ROUTES.ONBOARD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function getOAuthUrl(provider: 'google' | 'github'): string {
  const base = api.defaults.baseURL ?? '';
  return provider === 'google'
    ? `${base}${API_ROUTES.OAUTH_GOOGLE}`
    : `${base}${API_ROUTES.OAUTH_GITHUB}`;
}
