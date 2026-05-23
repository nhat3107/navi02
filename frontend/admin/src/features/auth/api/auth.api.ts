import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import { readAccessTokenFromBody } from '../../../shared/constants/tokens';
import type { AdminLoginRequest, AdminLoginResponse } from '../types/auth.types';

export async function adminLoginApi(
  data: AdminLoginRequest,
): Promise<{ accessToken: string }> {
  const res = await api.post<AdminLoginResponse>(API_ROUTES.ADMIN_LOGIN, {
    username: data.username.trim(),
    password: data.password,
  });
  const accessToken = readAccessTokenFromBody(res.data);
  if (!accessToken) {
    throw new Error('Login response missing access_token');
  }
  return { accessToken };
}
