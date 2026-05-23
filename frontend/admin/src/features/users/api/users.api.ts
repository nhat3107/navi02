import { api } from '../../../shared/utils/axios';
import {
  API_ROUTES,
  apiAdminUserBlock,
  apiAdminUserResetPenalty,
  apiAdminUserUnblock,
} from '../../../shared/constants/routes';
import type { AdminUser } from '../types/users.types';

export async function fetchUsers(query?: {
  limit?: number;
  skip?: number;
}): Promise<{ data: AdminUser[]; total: number }> {
  const res = await api.get<{ data: AdminUser[]; total: number }>(
    API_ROUTES.ADMIN_USERS,
    { params: query },
  );
  return res.data;
}

export async function blockUserApi(
  userId: string,
  blockDays = 7,
): Promise<void> {
  await api.patch(apiAdminUserBlock(userId), { blockDays });
}

export async function unblockUserApi(userId: string): Promise<void> {
  await api.patch(apiAdminUserUnblock(userId));
}

export async function resetViolationPenaltyApi(userId: string): Promise<void> {
  await api.patch(apiAdminUserResetPenalty(userId));
}
